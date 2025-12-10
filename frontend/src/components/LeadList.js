import React, { useEffect, useState } from 'react';
import { fetchLeads, updateLead, deleteLead } from '../api/leadsApi';

function LeadList() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    enquiry_for: '',
    agent_name: '',
    date_from: '',
    date_to: '',
  });
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [deletingId, setDeletingId] = useState(null);

  // NEW: view / edit modal state
  const [viewLead, setViewLead] = useState(null);
  const [editLead, setEditLead] = useState(null);
  const [editForm, setEditForm] = useState({
    customer_name: '',
    mobile_number: '',
    enquiry_for: '',
    status: 'pending',
    rejection_reason: '',
    agent_name: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await fetchLeads(filters);
      setLeads(data || []);
    } catch (err) {
      setError(err.message || 'Error loading leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    loadLeads();
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      enquiry_for: '',
      agent_name: '',
      date_from: '',
      date_to: '',
    });
    setTimeout(loadLeads, 0);
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!['pending', 'approved', 'rejected'].includes(newStatus)) return;

    const payload = { status: newStatus };

    if (newStatus === 'rejected') {
      const reason = prompt('Enter rejection reason:');
      if (!reason) {
        alert('Rejection reason is required.');
        return;
      }
      payload.rejection_reason = reason;
    }

    try {
      setUpdatingId(id);
      await updateLead(id, payload);
      await loadLeads();
    } catch (err) {
      alert(err.message || 'Failed to update lead');
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleRowSelection = (leadId) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedRows(newSelected);
  };

  const selectAllRows = () => {
    if (selectedRows.size === leads.length) {
      setSelectedRows(new Set());
    } else {
      const allIds = new Set(leads.map((lead) => lead.id));
      setSelectedRows(allIds);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'status-badge-pending';
      case 'approved':
        return 'status-badge-approved';
      case 'rejected':
        return 'status-badge-rejected';
      default:
        return '';
    }
  };

  const getProductIcon = (product) => {
    switch (product) {
      case 'Samsung':
        return '📱';
      case 'Apple':
        return '🍎';
      case 'Pixel':
        return '📸';
      default:
        return '📋';
    }
  };

  const handleDelete = async (lead) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete lead ${lead.leadId} for ${lead.customer_name}?`
    );
    if (!confirmDelete) return;

    try {
      setDeletingId(lead.id);
      await deleteLead(lead.id);
      await loadLeads();
      setSelectedRows((prev) => {
        const copy = new Set(prev);
        copy.delete(lead.id);
        return copy;
      });
    } catch (err) {
      alert(err.message || 'Failed to delete lead');
    } finally {
      setDeletingId(null);
    }
  };

  // ===== Export handler (CSV download) =====

  const handleExport = () => {
  if (!leads || leads.length === 0) {
    alert('No leads available to export.');
    return;
  }

  // Use selected rows if any, otherwise export all
  const rowsToExport =
    selectedRows.size > 0
      ? leads.filter((lead) => selectedRows.has(lead.id))
      : leads;

  if (rowsToExport.length === 0) {
    alert('No selected rows to export.');
    return;
  }

  const headers = [
    'Lead ID',
    'Customer Name',
    'Mobile Number',
    'Product',
    'Status',
    'Rejection Reason',
    'Agent Name',
    'Created Date',
    'Updated Date',
  ];

  const escapeCsv = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = rowsToExport.map((lead) => [
    lead.leadId,
    lead.customer_name,
    lead.mobile_number,
    lead.enquiry_for,
    lead.status,
    lead.rejection_reason || '',
    lead.agent_name || '',
    lead.created_date ? new Date(lead.created_date).toISOString() : '',
    lead.updated_date ? new Date(lead.updated_date).toISOString() : '',
  ]);

  const csvLines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ];

  const csvContent = csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');

  // If selected rows → name download differently
  const today = new Date().toISOString().slice(0, 10);
  link.download =
    selectedRows.size > 0
      ? `selected_leads_${today}.csv`
      : `all_leads_${today}.csv`;

  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};


  // ===== NEW: View / Edit modal handlers =====

  const openViewModal = (lead) => {
    setEditLead(null);
    setViewLead(lead);
  };

  const openEditModal = (lead) => {
    setViewLead(null);
    setEditLead(lead);
    setEditForm({
      customer_name: lead.customer_name || '',
      mobile_number: lead.mobile_number || '',
      enquiry_for: lead.enquiry_for || '',
      status: lead.status || 'pending',
      rejection_reason: lead.rejection_reason || '',
      agent_name: lead.agent_name || '',
    });
  };

  const closeModals = () => {
    setViewLead(null);
    setEditLead(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editLead) return;

    try {
      setSavingEdit(true);
      await updateLead(editLead.id, editForm);
      await loadLeads();
      closeModals();
    } catch (err) {
      alert(err.message || 'Failed to update lead');
    } finally {
      setSavingEdit(false);
    }
  };

  // ===== render =====

  return (
    <div className="card">
      <div className="card-header">
        <h2>Lead Dashboard</h2>
        <div className="card-subtitle">
          Manage and track all your leads in one unified dashboard
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label className="filter-label">Status Filter</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">All Status</option>
            <option value="pending">⏳ Pending</option>
            <option value="approved">✅ Approved</option>
            <option value="rejected">❌ Rejected</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Product</label>
          <select
            name="enquiry_for"
            value={filters.enquiry_for}
            onChange={handleFilterChange}
          >
            <option value="">All Products</option>
            <option value="Samsung">📱 Samsung</option>
            <option value="Apple">🍎 Apple</option>
            <option value="Pixel">📸 Pixel</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Agent Search</label>
          <input
            type="text"
            name="agent_name"
            value={filters.agent_name}
            onChange={handleFilterChange}
            placeholder="Enter agent name..."
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Date Range</label>
          <div className="date-inputs">
            <input
              type="date"
              name="date_from"
              value={filters.date_from}
              onChange={handleFilterChange}
            />
            <span className="date-separator">to</span>
            <input
              type="date"
              name="date_to"
              value={filters.date_to}
              onChange={handleFilterChange}
            />
          </div>
        </div>

        <div className="filter-actions">
          <button onClick={applyFilters} className="apply-btn">
            🔍 Apply Filters
          </button>
          <button className="secondary reset-btn" onClick={resetFilters}>
            🗑️ Clear All
          </button>
        </div>
      </div>

      {error && (
        <div className="error">
          <div className="error-icon">⚠️</div>
          <div className="error-message">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3 className="empty-title">No leads found</h3>
          <p className="empty-description">
            Try adjusting your filters or import new leads
          </p>
        </div>
      ) : (
        <>
          <div className="table-actions">
            <div className="selected-count">
              <input
                type="checkbox"
                checked={selectedRows.size === leads.length && leads.length > 0}
                onChange={selectAllRows}
                className="select-all-checkbox"
              />
              <span className="selected-text">
                {selectedRows.size > 0
                  ? `${selectedRows.size} selected`
                  : `${leads.length} leads found`}
              </span>
            </div>
            <div className="action-buttons">
              <button
                className="action-btn export-btn"
                onClick={handleExport}
              >
                📤 Export Data
              </button>
              <button
                className="action-btn refresh-btn"
                onClick={loadLeads}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Lead ID</th>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Rejection Reason</th>
                  <th>Agent</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={selectedRows.has(lead.id) ? 'row-selected' : ''}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(lead.id)}
                        onChange={() => toggleRowSelection(lead.id)}
                        className="row-checkbox"
                      />
                    </td>
                    <td>
                      <div className="lead-id">{lead.leadId}</div>
                    </td>
                    <td>
                      <div className="customer-info">
                        <div className="customer-name">
                          {lead.customer_name}
                        </div>
                        <div className="customer-id">ID: {lead.id}</div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div className="phone-number">
                          {lead.mobile_number}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="product-info">
                        <span className="product-icon">
                          {getProductIcon(lead.enquiry_for)}
                        </span>
                        <span className="product-name">
                          {lead.enquiry_for}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="status-container">
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            handleStatusChange(lead.id, e.target.value)
                          }
                          disabled={updatingId === lead.id}
                          className={`status-select ${getStatusBadgeClass(
                            lead.status
                          )}`}
                        >
                          <option value="pending">⏳ Pending</option>
                          <option value="approved">✅ Approved</option>
                          <option value="rejected">❌ Rejected</option>
                        </select>
                        {updatingId === lead.id && (
                          <span className="updating-indicator">🔄</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="rejection-reason">
                        {lead.rejection_reason || '-'}
                      </div>
                    </td>
                    <td>
                      <div className="agent-info">
                        <div className="agent-avatar">
                          {lead.agent_name?.charAt(0) || 'A'}
                        </div>
                        <div className="agent-details">
                          <div className="agent-name">
                            {lead.agent_name || 'Unassigned'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="date-info">
                        <div className="date">
                          {new Date(lead.created_date).toLocaleDateString()}
                        </div>
                        <div className="time">
                          {new Date(lead.created_date).toLocaleTimeString(
                            [],
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons-small">
                        <button
                          className="action-btn-small view-btn"
                          title="View Details"
                          onClick={() => openViewModal(lead)}
                        >
                          👁️
                        </button>
                        <button
                          className="action-btn-small edit-btn"
                          title="Edit Lead"
                          onClick={() => openEditModal(lead)}
                        >
                          ✏️
                        </button>
                        <button
                          className="action-btn-small delete-btn"
                          title="Delete Lead"
                          onClick={() => handleDelete(lead)}
                          disabled={deletingId === lead.id}
                        >
                          {deletingId === lead.id ? '⏳' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button className="pagination-btn prev-btn" disabled>
              ← Previous
            </button>
            <div className="page-numbers">
              <button className="page-btn active">1</button>
              <button className="page-btn">2</button>
              <button className="page-btn">3</button>
              <span className="page-dots">...</span>
              <button className="page-btn">10</button>
            </div>
            <button className="pagination-btn next-btn">Next →</button>
          </div>
        </>
      )}

      {/* ===== View Lead Modal ===== */}
      {viewLead && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Lead Details</h3>
              <button className="modal-close-btn" onClick={closeModals}>
                ✖
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-section">
                <h4>Customer</h4>
                <p>
                  <strong>Name:</strong> {viewLead.customer_name}
                </p>
                <p>
                  <strong>Mobile:</strong> {viewLead.mobile_number}
                </p>
                <p>
                  <strong>Lead ID:</strong> {viewLead.leadId}
                </p>
              </div>

              <div className="modal-section">
                <h4>Product & Status</h4>
                <p>
                  <strong>Product:</strong> {viewLead.enquiry_for}
                </p>
                <p>
                  <strong>Status:</strong> {viewLead.status}
                </p>
                <p>
                  <strong>Rejection Reason:</strong>{' '}
                  {viewLead.rejection_reason || '-'}
                </p>
              </div>

              <div className="modal-section">
                <h4>Agent & Timestamps</h4>
                <p>
                  <strong>Agent Name:</strong>{' '}
                  {viewLead.agent_name || 'Unassigned'}
                </p>
                <p>
                  <strong>Created:</strong>{' '}
                  {new Date(viewLead.created_date).toLocaleString()}
                </p>
                <p>
                  <strong>Updated:</strong>{' '}
                  {new Date(viewLead.updated_date).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="primary-btn"
                onClick={() => openEditModal(viewLead)}
              >
                ✏️ Edit Lead
              </button>
              <button className="secondary-btn" onClick={closeModals}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Edit Lead Modal ===== */}
      {editLead && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Lead</h3>
              <button className="modal-close-btn" onClick={closeModals}>
                ✖
              </button>
            </div>

            <form className="modal-body" onSubmit={handleEditSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Customer Name</label>
                  <input
                    type="text"
                    name="customer_name"
                    value={editForm.customer_name}
                    onChange={handleEditChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Mobile Number</label>
                  <input
                    type="text"
                    name="mobile_number"
                    value={editForm.mobile_number}
                    onChange={handleEditChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Product</label>
                  <select
                    name="enquiry_for"
                    value={editForm.enquiry_for}
                    onChange={handleEditChange}
                    required
                  >
                    <option value="">Select product</option>
                    <option value="Samsung">Samsung</option>
                    <option value="Apple">Apple</option>
                    <option value="Pixel">Pixel</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={editForm.status}
                    onChange={handleEditChange}
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Agent Name</label>
                  <input
                    type="text"
                    name="agent_name"
                    value={editForm.agent_name}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="form-group form-group-full">
                  <label>Rejection Reason</label>
                  <textarea
                    name="rejection_reason"
                    value={editForm.rejection_reason}
                    onChange={handleEditChange}
                    rows={3}
                    placeholder="Only needed when status is rejected"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={savingEdit}
                >
                  {savingEdit ? 'Saving...' : '💾 Save Changes'}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeModals}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadList;
