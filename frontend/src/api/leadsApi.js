const API_BASE = ''; 
export async function fetchLeads(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/leads?${query}` : '/leads';

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch leads');
  return res.json();
}

export async function updateLead(id, data) {
  const res = await fetch(`/leads/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to update lead');
  }
  return json;
}


export async function uploadHeaders(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/leads/upload-headers', {
    method: 'POST',
    body: formData,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to upload file');
  }
  return json;
}


export async function previewLeads(fileToken, mapping) {
  const res = await fetch('/leads/preview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileToken, mapping }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to preview data');
  }
  return json;
}


export async function uploadFinal(rows) {
  const res = await fetch('/leads/upload-final', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rows }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to upload data');
  }
  return json;
}


export async function deleteLead(id) {
  const res = await fetch(`/leads/${id}`, {
    method: 'DELETE',
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to delete lead');
  }
  return json;
}