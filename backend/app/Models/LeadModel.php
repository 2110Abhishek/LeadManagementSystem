<?php

namespace App\Models;

use CodeIgniter\Model;

class LeadModel extends Model
{
    protected $table            = 'leads';
    protected $primaryKey       = 'id';
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;

    protected $allowedFields    = [
        'leadId',
        'customer_name',
        'mobile_number',
        'enquiry_for',
        'status',
        'rejection_reason',
        'agent_id',
        'agent_name',
        'created_date',
        'updated_date',
    ];

    // We’re using MySQL defaults for timestamps, so no CI auto timestamps
    protected $useTimestamps = false;
}
