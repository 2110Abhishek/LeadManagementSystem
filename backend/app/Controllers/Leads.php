<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\LeadModel;
use CodeIgniter\HTTP\ResponseInterface;

class Leads extends BaseController
{
    protected $leadModel;

    public function __construct()
    {
        $this->leadModel = new LeadModel();
    }

    public function delete($id = null)
{
    if ($id === null || !ctype_digit((string)$id)) {
        return $this->response->setStatusCode(400)
            ->setJSON([
                'success' => false,
                'message' => 'Invalid lead ID'
            ]);
    }

    $lead = $this->leadModel->find($id);  
    if (!$lead) {
        return $this->response->setStatusCode(404)
            ->setJSON([
                'success' => false,
                'message' => 'Lead not found'
            ]);
    }

    try {
        $this->leadModel->delete($id);  

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Lead deleted successfully'
        ]);

    } catch (\Throwable $e) {
        return $this->response->setStatusCode(500)
            ->setJSON([
                'success' => false,
                'message' => 'Failed to delete lead: ' . $e->getMessage()
            ]);
    }
}

    
    public function index()
    {
        $status      = $this->request->getGet('status');
        $enquiryFor  = $this->request->getGet('enquiry_for');
        $agentName   = $this->request->getGet('agent_name');
        $dateFrom    = $this->request->getGet('date_from');
        $dateTo      = $this->request->getGet('date_to');

        $builder = $this->leadModel->builder();

       
        $builder->select('*');

        if (!empty($status)) {
            $builder->where('status', $status);
        }

        if (!empty($enquiryFor)) {
            $builder->where('enquiry_for', $enquiryFor);
        }

        if (!empty($agentName)) {
            $builder->like('agent_name', $agentName);
        }

        if (!empty($dateFrom)) {
            $builder->where('created_date >=', $dateFrom . ' 00:00:00');
        }

        if (!empty($dateTo)) {
            $builder->where('created_date <=', $dateTo . ' 23:59:59');
        }

        $builder->orderBy('updated_date', 'DESC');

        $results = $builder->get()->getResultArray();

        return $this->response->setJSON([
            'success' => true,
            'data'    => $results,
        ]);
    }

    
    public function update($id = null)
    {
        if ($id === null) {
            return $this->response
                ->setStatusCode(ResponseInterface::HTTP_BAD_REQUEST)
                ->setJSON(['success' => false, 'message' => 'Lead ID is required']);
        }
        

        $lead = $this->leadModel->find($id);

        if (!$lead) {
            return $this->response
                ->setStatusCode(ResponseInterface::HTTP_NOT_FOUND)
                ->setJSON(['success' => false, 'message' => 'Lead not found']);
        }

        
        $input = $this->request->getJSON(true) ?? $this->request->getRawInput();

        $allowedFields = [
            'customer_name',
            'mobile_number',
            'enquiry_for',
            'status',
            'rejection_reason',
            'agent_id',
            'agent_name',
        ];

        $data = array_intersect_key($input, array_flip($allowedFields));

        
        if (isset($data['status'])) {
            $validStatuses = ['pending', 'approved', 'rejected'];
            if (!in_array($data['status'], $validStatuses, true)) {
                return $this->response
                    ->setStatusCode(ResponseInterface::HTTP_BAD_REQUEST)
                    ->setJSON([
                        'success' => false,
                        'message' => 'Invalid status. Allowed: pending, approved, rejected',
                    ]);
            }

            if ($data['status'] === 'rejected') {
                if (empty($data['rejection_reason'])) {
                    return $this->response
                        ->setStatusCode(ResponseInterface::HTTP_BAD_REQUEST)
                        ->setJSON([
                            'success' => false,
                            'message' => 'rejection_reason is required when status is rejected',
                        ]);
                }
            } else {
               
                if (array_key_exists('rejection_reason', $data) && $data['rejection_reason'] === '') {
                    $data['rejection_reason'] = null;
                }
            }
        }

        
        if (isset($data['mobile_number'])) {
            $existing = $this->leadModel
                ->where('mobile_number', $data['mobile_number'])
                ->where('id !=', $id)
                ->first();

            if ($existing) {
                return $this->response
                    ->setStatusCode(ResponseInterface::HTTP_CONFLICT)
                    ->setJSON([
                        'success' => false,
                        'message' => 'mobile_number must be unique. This number already exists for another lead.',
                    ]);
            }
        }

        if (empty($data)) {
            return $this->response
                ->setStatusCode(ResponseInterface::HTTP_BAD_REQUEST)
                ->setJSON([
                    'success' => false,
                    'message' => 'No valid fields provided for update',
                ]);
        }

        
        $this->leadModel->update($id, $data);

        $updated = $this->leadModel->find($id);

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Lead updated successfully',
            'data'    => $updated,
        ]);
    }
}
