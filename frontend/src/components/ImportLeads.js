import React, { useState } from 'react';
import {
  uploadHeaders,
  previewLeads,
  uploadFinal,
} from '../api/leadsApi';

function ImportLeads() {
  const [file, setFile] = useState(null);
  const [fileColumns, setFileColumns] = useState([]);
  const [systemFields, setSystemFields] = useState([]);
  const [fileToken, setFileToken] = useState('');
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState([]);
  const [errors, setErrors] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Reset everything on new file
      setFileColumns([]);
      setSystemFields([]);
      setFileToken('');
      setMapping({});
      setPreview([]);
      setErrors({});
      setSelectedRows([]);
      setSummary(null);
      setStep(1);
    }
  };

  const handleUploadHeaders = async () => {
    if (!file) {
      alert('📁 Please choose a CSV/XLS/XLSX file first.');
      return;
    }
    try {
      setLoading(true);
      setGlobalError('');
      const res = await uploadHeaders(file);
      setFileColumns(res.file_columns || []);
      setSystemFields(res.system_fields || []);
      setFileToken(res.fileToken);
      // Initialize mapping with empty
      const initialMapping = {};
      (res.system_fields || []).forEach((sf) => {
        initialMapping[sf] = '';
      });
      setMapping(initialMapping);
      setStep(2);
    } catch (err) {
      setGlobalError(err.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (systemField, value) => {
    setMapping((prev) => ({
      ...prev,
      [systemField]: value,
    }));
  };

  const handlePreview = async () => {
    if (!fileToken) {
      alert('No uploaded file token. Please upload again.');
      return;
    }
    try {
      setLoading(true);
      setGlobalError('');
      const res = await previewLeads(fileToken, mapping);
      setPreview(res.preview || []);
      setErrors(res.errors || {});
      // By default, select all rows that do not have validation errors
      const defaultSelected = (res.preview || [])
        .filter((row) => {
          const rowErrors = res.errors?.[row._rowIndex] || [];
          return rowErrors.length === 0;
        })
        .map((row) => row._rowIndex);
      setSelectedRows(defaultSelected);
      setStep(3);
    } catch (err) {
      setGlobalError(err.message || 'Failed to preview data');
    } finally {
      setLoading(false);
    }
  };

  const toggleRowSelection = (rowIndex) => {
    setSelectedRows((prev) =>
      prev.includes(rowIndex)
        ? prev.filter((i) => i !== rowIndex)
        : [...prev, rowIndex]
    );
  };

  const handleSelectAll = () => {
    if (preview.length === 0) return;
    const allRowIndexes = preview.map((r) => r._rowIndex);
    setSelectedRows(allRowIndexes);
  };

  const handleClearSelection = () => {
    setSelectedRows([]);
  };

  const handleFinalUpload = async () => {
    if (selectedRows.length === 0) {
      alert('📋 No rows selected for upload.');
      return;
    }
    try {
      setLoading(true);
      setGlobalError('');
      const rowsToUpload = preview.filter((row) =>
        selectedRows.includes(row._rowIndex)
      );
      const res = await uploadFinal(rowsToUpload);
      setSummary(res.summary || null);
      setStep(4);
    } catch (err) {
      setGlobalError(err.message || 'Failed to upload data');
    } finally {
      setLoading(false);
    }
  };

  const getStepProgress = () => {
    const steps = [
      { number: 1, label: 'Upload', active: step >= 1 },
      { number: 2, label: 'Map', active: step >= 2 },
      { number: 3, label: 'Preview', active: step >= 3 },
      { number: 4, label: 'Import', active: step >= 4 },
    ];
    return steps;
  };

  const getValidationIcon = (row) => {
    const rowErr = errors[row._rowIndex] || [];
    if (rowErr.length > 0) return { icon: '❌', color: '#ef4444', text: 'Error' };
    if (row.duplicate) return { icon: '⚠️', color: '#f59e0b', text: 'Duplicate' };
    return { icon: '✅', color: '#10b981', text: 'Valid' };
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>📥 Bulk Import Leads</h2>
        <div className="card-subtitle">
          Import leads from CSV, XLS, or XLSX files with smart column mapping
        </div>
      </div>

      {/* Progress Steps */}
      <div className="progress-steps">
        {getStepProgress().map((stepItem) => (
          <div key={stepItem.number} className="step-indicator">
            <div className={`step-circle ${stepItem.active ? 'active' : ''}`}>
              {stepItem.active ? '✓' : stepItem.number}
            </div>
            <div className="step-label">{stepItem.label}</div>
            {stepItem.number < 4 && (
              <div className="step-connector"></div>
            )}
          </div>
        ))}
      </div>

      {globalError && (
        <div className="error">
          <div className="error-icon">⚠️</div>
          <div className="error-message">{globalError}</div>
        </div>
      )}

      {/* STEP 1: File upload */}
      <section className="step">
        <div className="step-header">
          <div className="step-number">1</div>
          <h3>Upload Your File</h3>
        </div>
        
        <div className="upload-area">
          <div className="upload-box">
            <div className="upload-icon">📁</div>
            <p className="upload-text">Drag & drop your file here</p>
            <p className="upload-subtext">or click to browse</p>
            <div className="file-types">
              <span className="file-type-badge">.CSV</span>
              <span className="file-type-badge">.XLS</span>
              <span className="file-type-badge">.XLSX</span>
            </div>
            <input
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileChange}
              className="file-input"
            />
          </div>
          
          {file && (
            <div className="file-preview">
              <div className="file-icon">📄</div>
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-size">
                  {(file.size / 1024).toFixed(2)} KB
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="step-actions">
          <button 
            onClick={handleUploadHeaders} 
            disabled={loading || !file}
            className="primary-btn"
          >
            {loading && step === 1 ? (
              <>
                <span className="loading-spinner-small"></span>
                Uploading...
              </>
            ) : (
              <>
                📤 Upload & Continue
                <span className="action-arrow">→</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* STEP 2: Mapping */}
      {step >= 2 && (
        <section className="step">
          <div className="step-header">
            <div className="step-number">2</div>
            <h3>Map Your Columns</h3>
          </div>
          
          <div className="mapping-intro">
            <p>Match your file columns to our system fields. Required fields are marked with *</p>
          </div>
          
          {systemFields.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔄</div>
              <p className="empty-description">Loading system fields...</p>
            </div>
          ) : (
            <div className="mapping-container">
              <table className="mapping-table">
                <thead>
                  <tr>
                    <th>System Field</th>
                    <th>Description</th>
                    <th>File Column</th>
                  </tr>
                </thead>
                <tbody>
                  {systemFields.map((sf) => {
                    const isRequired = ['customer_name', 'mobile_number', 'enquiry_for'].includes(sf);
                    return (
                      <tr key={sf} className={isRequired ? 'required-field' : ''}>
                        <td>
                          <div className="field-name">
                            {sf.replace('_', ' ')}
                            {isRequired && <span className="required-star">*</span>}
                          </div>
                        </td>
                        <td>
                          <div className="field-description">
                            {isRequired ? 'Required field' : 'Optional field'}
                          </div>
                        </td>
                        <td>
                          <select
                            value={mapping[sf] || ''}
                            onChange={(e) => handleMappingChange(sf, e.target.value)}
                            className="mapping-select"
                          >
                            <option value="">-- Select Column --</option>
                            {fileColumns.map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </select>
                          {mapping[sf] && (
                            <div className="mapping-hint">
                              Mapped to: <span className="mapped-column">{mapping[sf]}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="step-actions">
            <button 
              onClick={() => setStep(1)}
              className="secondary-btn"
            >
              ← Back
            </button>
            <button
              onClick={handlePreview}
              disabled={loading || !fileToken}
              className="primary-btn"
            >
              {loading && step === 2 ? (
                <>
                  <span className="loading-spinner-small"></span>
                  Generating Preview...
                </>
              ) : (
                <>
                  👁️ Preview Data
                  <span className="action-arrow">→</span>
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* STEP 3: Preview */}
      {step >= 3 && (
        <section className="step">
          <div className="step-header">
            <div className="step-number">3</div>
            <h3>Preview & Select Rows</h3>
          </div>
          
          <div className="preview-stats">
            <div className="stat-card">
              <div className="stat-value">{preview.length}</div>
              <div className="stat-label">Total Rows</div>
            </div>
            <div className="stat-card valid">
              <div className="stat-value">
                {preview.filter((row) => {
                  const rowErrors = errors[row._rowIndex] || [];
                  return rowErrors.length === 0;
                }).length}
              </div>
              <div className="stat-label">Valid Rows</div>
            </div>
            <div className="stat-card error">
              <div className="stat-value">
                {Object.keys(errors).length}
              </div>
              <div className="stat-label">With Errors</div>
            </div>
            <div className="stat-card selected">
              <div className="stat-value">{selectedRows.length}</div>
              <div className="stat-label">Selected</div>
            </div>
          </div>

          {preview.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <p className="empty-description">No preview data available</p>
            </div>
          ) : (
            <>
              <div className="selection-controls">
                <div className="select-all-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === preview.length}
                      onChange={handleSelectAll}
                      className="checkbox"
                    />
                    <span>Select All</span>
                  </label>
                  <button 
                    className="clear-btn"
                    onClick={handleClearSelection}
                  >
                    Clear Selection
                  </button>
                </div>
                <div className="selection-info">
                  {selectedRows.length} of {preview.length} rows selected
                </div>
              </div>

              <div className="table-wrapper">
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th width="50">#</th>
                      <th width="80">Status</th>
                      <th>Customer</th>
                      <th>Mobile</th>
                      <th>Product</th>
                      <th>Status</th>
                      <th>Agent</th>
                      <th width="80">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row) => {
                      const rowErr = errors[row._rowIndex] || [];
                      const hasErrors = rowErr.length > 0;
                      const validation = getValidationIcon(row);
                      return (
                        <tr
                          key={row._rowIndex}
                          className={hasErrors ? 'row-error' : ''}
                        >
                          <td className="row-number">{row._rowIndex + 1}</td>
                          <td>
                            <div 
                              className="validation-badge"
                              style={{ backgroundColor: validation.color + '20' }}
                            >
                              <span className="validation-icon">{validation.icon}</span>
                              <span className="validation-text">{validation.text}</span>
                            </div>
                          </td>
                          <td>{row.customer_name}</td>
                          <td>{row.mobile_number}</td>
                          <td>{row.enquiry_for}</td>
                          <td>
                            <span className={`status-tag ${row.status || 'pending'}`}>
                              {row.status || 'pending'}
                            </span>
                          </td>
                          <td>{row.agent_name || '-'}</td>
                          <td>
                            <label className="checkbox-label-center">
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(row._rowIndex)}
                                onChange={() => toggleRowSelection(row._rowIndex)}
                                disabled={hasErrors}
                                className="checkbox"
                              />
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {Object.keys(errors).length > 0 && (
                <div className="errors-section">
                  <div className="errors-header">
                    <span className="errors-icon">⚠️</span>
                    <h4>Validation Errors</h4>
                  </div>
                  <div className="errors-list">
                    {Object.entries(errors).slice(0, 5).map(([rowIndex, errorList]) => (
                      <div key={rowIndex} className="error-item">
                        <div className="error-row">Row {parseInt(rowIndex) + 2}:</div>
                        <div className="error-messages">
                          {errorList.map((err, i) => (
                            <div key={i} className="error-message">{err}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="step-actions">
                <button 
                  onClick={() => setStep(2)}
                  className="secondary-btn"
                >
                  ← Back
                </button>
                <button
                  onClick={handleFinalUpload}
                  disabled={loading || selectedRows.length === 0}
                  className="primary-btn"
                >
                  {loading && step === 3 ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      🚀 Import Selected ({selectedRows.length})
                      <span className="action-arrow">→</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* STEP 4: Summary */}
      {step >= 4 && summary && (
        <section className="step">
          <div className="step-header">
            <div className="step-number">4</div>
            <h3>Import Complete! 🎉</h3>
          </div>
          
          <div className="success-card">
            <div className="success-icon">✅</div>
            <div className="success-content">
              <h4 className="success-title">Data Imported Successfully</h4>
              <p className="success-description">
                Your leads have been processed and imported into the system
              </p>
            </div>
          </div>

          <div className="summary-grid">
            <div className="summary-card total">
              <div className="summary-value">{summary.total}</div>
              <div className="summary-label">Total Rows</div>
            </div>
            <div className="summary-card inserted">
              <div className="summary-value">{summary.inserted}</div>
              <div className="summary-label">New Leads</div>
            </div>
            <div className="summary-card updated">
              <div className="summary-value">{summary.updated}</div>
              <div className="summary-label">Updated</div>
            </div>
            <div className="summary-card errors">
              <div className="summary-value">{summary.errors}</div>
              <div className="summary-label">Errors</div>
            </div>
          </div>

          <div className="step-actions">
            <button 
              onClick={() => {
                setFile(null);
                setFileColumns([]);
                setSystemFields([]);
                setFileToken('');
                setMapping({});
                setPreview([]);
                setErrors({});
                setSelectedRows([]);
                setSummary(null);
                setStep(1);
              }}
              className="primary-btn"
            >
              🔄 Import Another File
            </button>
            <button className="secondary-btn">
              📊 View Imported Leads
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default ImportLeads;