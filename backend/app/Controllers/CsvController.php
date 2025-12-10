<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\LeadModel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use CodeIgniter\HTTP\ResponseInterface;

class CsvController extends BaseController
{
    protected $leadModel;

    // Standard fields your system understands
    protected $systemFields = [
        'customer_name',
        'mobile_number',
        'enquiry_for',
        'status',
        'rejection_reason',
        'agent_id',
        'agent_name',
    ];

    public function __construct()
    {
        $this->leadModel = new LeadModel();
    }

    /**
     * 1️⃣ Upload file and return headers + system fields + fileToken
     * Endpoint: POST /leads/upload-headers
     * Form-data:
     *  - file: CSV/XLS/XLSX
     */
    public function uploadHeaders()
    {
        $file = $this->request->getFile('file');

        if (!$file || !$file->isValid()) {
            return $this->response->setStatusCode(ResponseInterface::HTTP_BAD_REQUEST)
                ->setJSON([
                    'success' => false,
                    'message' => 'Invalid or missing file.',
                ]);
        }

        // Ensure writable/uploads exists
        $uploadDir = WRITEPATH . 'uploads';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        // Move file to writable/uploads with a random name
        $newName = $file->getRandomName();
        $file->move($uploadDir, $newName);

        $storedPath = $uploadDir . DIRECTORY_SEPARATOR . $newName;

        // Read first row as header
        $spreadsheet = IOFactory::load($storedPath);
        $sheet       = $spreadsheet->getActiveSheet();

        $headers = [];
        foreach ($sheet->getRowIterator(1, 1) as $row) {
            foreach ($row->getCellIterator() as $cell) {
                $headers[] = trim((string) $cell->getValue());
            }
        }

        return $this->response->setJSON([
            'success'       => true,
            'file_columns'  => $headers,
            'system_fields' => $this->systemFields,
            // This is what frontend will use for /preview
            'fileToken'     => $newName,
        ]);
    }

    /**
     * 2️⃣ Preview mapped data
     * Endpoint: POST /leads/preview
     * Body (JSON):
     *  {
     *    "fileToken": "abc123.xlsx",
     *    "mapping": {
     *      "customer_name": "FullName",
     *      "mobile_number": "MobNo",
     *      ...
     *    }
     *  }
     */
    public function preview()
    {
        $body = $this->request->getJSON(true);

        if (!isset($body['fileToken'], $body['mapping']) || !is_array($body['mapping'])) {
            return $this->response->setStatusCode(ResponseInterface::HTTP_BAD_REQUEST)
                ->setJSON([
                    'success' => false,
                    'message' => 'fileToken and mapping are required.',
                ]);
        }

        $fileToken = $body['fileToken'];
        $mapping   = $body['mapping'];

        $filePath = WRITEPATH . 'uploads' . DIRECTORY_SEPARATOR . $fileToken;

        if (!is_file($filePath)) {
            return $this->response->setStatusCode(ResponseInterface::HTTP_BAD_REQUEST)
                ->setJSON([
                    'success' => false,
                    'message' => 'Uploaded file not found. Please re-upload.',
                ]);
        }

        $spreadsheet = IOFactory::load($filePath);
        $rows        = $spreadsheet->getActiveSheet()->toArray();

        if (empty($rows)) {
            return $this->response->setJSON([
                'success' => false,
                'message' => 'File appears to be empty.',
            ]);
        }

        $headerRow = $rows[0];
        $dataRows  = array_slice($rows, 1);

        $preview = [];
        $errors  = [];

        foreach ($dataRows as $rowIndex => $row) {
            $record = [];

            // Build record according to mapping
            foreach ($this->systemFields as $field) {
                $columnName = $mapping[$field] ?? null;
                if (!$columnName) {
                    $record[$field] = null;
                    continue;
                }

                $colIndex = array_search($columnName, $headerRow, true);
                $record[$field] = $colIndex === false ? null : ($row[$colIndex] ?? null);
            }

            // Trim strings
            foreach ($record as $k => $v) {
                if (is_string($v)) {
                    $record[$k] = trim($v);
                }
            }

            // VALIDATION
            $rowErrors = [];

            // Mandatory fields
            if (empty($record['customer_name'])) {
                $rowErrors[] = 'customer_name missing';
            }
            if (empty($record['mobile_number'])) {
                $rowErrors[] = 'mobile_number missing';
            }
            if (empty($record['enquiry_for'])) {
                $rowErrors[] = 'enquiry_for missing';
            }

            // Status validation (optional but must be valid if provided)
            if (!empty($record['status'])) {
                $validStatuses = ['pending', 'approved', 'rejected'];
                if (!in_array(strtolower($record['status']), $validStatuses, true)) {
                    $rowErrors[] = 'Invalid status (use pending/approved/rejected)';
                } else {
                    // normalize status to lowercase for DB
                    $record['status'] = strtolower($record['status']);
                }
            } else {
                // default if empty
                $record['status'] = 'pending';
            }

            // Rejection reason requirement
            if ($record['status'] === 'rejected' && empty($record['rejection_reason'])) {
                $rowErrors[] = 'rejection_reason required when status is rejected';
            }

            // Duplicate detection by mobile_number
            $record['duplicate'] = false;
            if (!empty($record['mobile_number'])) {
                $existing = $this->leadModel
                    ->where('mobile_number', $record['mobile_number'])
                    ->first();
                if ($existing) {
                    $record['duplicate'] = true;
                }
            }

            if (!empty($rowErrors)) {
                // +2 because row indexes are zero-based and first row is header
                $errors[$rowIndex + 2] = $rowErrors;
            }

            // Include original row index to help frontend
            $record['_rowIndex'] = $rowIndex + 2;

            $preview[] = $record;
        }

        return $this->response->setJSON([
            'success' => true,
            'preview' => $preview,
            'errors'  => $errors,
        ]);
    }

    /**
     * 3️⃣ Final upload
     * Endpoint: POST /leads/upload-final
     * Body (JSON):
     *  {
     *    "rows": [ { customer_name, mobile_number, ... , duplicate, _rowIndex }, ... ]
     *  }
     */
    public function finalUpload()
    {
        $body = $this->request->getJSON(true);

        if (!isset($body['rows']) || !is_array($body['rows'])) {
            return $this->response->setStatusCode(ResponseInterface::HTTP_BAD_REQUEST)
                ->setJSON([
                    'success' => false,
                    'message' => 'rows array is required.',
                ]);
        }

        $rows = $body['rows'];

        $summary = [
            'total'    => count($rows),
            'inserted' => 0,
            'updated'  => 0,
            'errors'   => 0,
        ];

        foreach ($rows as $row) {
            // Clean out frontend-only fields
            unset($row['_rowIndex']);

            // Basic checks
            if (empty($row['mobile_number']) || empty($row['customer_name']) || empty($row['enquiry_for'])) {
                $summary['errors']++;
                continue;
            }

            // Normalize status
            $row['status'] = $row['status'] ?? 'pending';
            $row['status'] = strtolower($row['status']);

            if ($row['status'] === 'rejected' && empty($row['rejection_reason'])) {
                $summary['errors']++;
                continue;
            }

            // Check existing by mobile_number
            $existing = $this->leadModel
                ->where('mobile_number', $row['mobile_number'])
                ->first();

            if ($existing) {
                // Update (id from existing)
                $this->leadModel->update($existing['id'], [
                    'customer_name'     => $row['customer_name'],
                    'mobile_number'     => $row['mobile_number'],
                    'enquiry_for'       => $row['enquiry_for'],
                    'status'            => $row['status'],
                    'rejection_reason'  => $row['rejection_reason'] ?? null,
                    'agent_id'          => $row['agent_id'] ?? null,
                    'agent_name'        => $row['agent_name'] ?? null,
                    // updated_date will auto-update in DB
                ]);
                $summary['updated']++;
            } else {
                // Insert new lead with generated leadId
                $row['leadId'] = $this->generateLeadId();
                $this->leadModel->insert([
                    'leadId'           => $row['leadId'],
                    'customer_name'    => $row['customer_name'],
                    'mobile_number'    => $row['mobile_number'],
                    'enquiry_for'      => $row['enquiry_for'],
                    'status'           => $row['status'],
                    'rejection_reason' => $row['rejection_reason'] ?? null,
                    'agent_id'         => $row['agent_id'] ?? null,
                    'agent_name'       => $row['agent_name'] ?? null,
                ]);
                $summary['inserted']++;
            }
        }

        return $this->response->setJSON([
            'success' => true,
            'summary' => $summary,
        ]);
    }

    /**
     * Helper: generate leadId LDYYYYMMDD-XXX
     */
    protected function generateLeadId(): string
    {
        $datePart = date('Ymd');
        $random   = rand(100, 999); // good enough for this assignment
        return "LD{$datePart}-{$random}";
    }
}
