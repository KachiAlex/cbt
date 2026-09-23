import React, { useEffect, useState } from 'react';
import dataService from '../services/dataService';
import { formatResultDate } from '../utils/resultDate';

const DemoRequestsManagement = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError('');
      setLeads(await dataService.getDemoRequests());
    } catch (err) {
      setError(err.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await dataService.updateDemoRequestStatus(id, status);
      await loadLeads();
    } catch (err) {
      setError(err.message || 'Failed to update request.');
    }
  };

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Trial & Contact Requests</h2>
          <p className="text-sm text-gray-600">Review and track requests submitted from the public website.</p>
        </div>
        <button onClick={loadLeads} disabled={loading} className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 disabled:opacity-50">
          Refresh
        </button>
      </div>
      {error && <p role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="py-8 text-center text-gray-500">Loading requests...</p> : leads.length === 0 ? (
        <p className="rounded-lg bg-white p-8 text-center text-gray-500">No requests yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Type', 'Name', 'Institution', 'Email', 'Phone', 'Submitted', 'Status'].map(label => (
                  <th key={label} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map(lead => (
                <tr key={lead.id}>
                  <td className="px-4 py-3 text-sm text-gray-700">{lead.kind === 'demo' ? 'Trial' : 'Contact'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{lead.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{lead.school || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{lead.email ? <a className="text-blue-600 hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a> : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{lead.phone || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{formatResultDate(lead, true)}</td>
                  <td className="px-4 py-3">
                    <select aria-label={`Status for ${lead.name || lead.email || lead.id}`} value={lead.status || 'new'} onChange={event => updateStatus(lead.id, event.target.value)} className="rounded border border-gray-300 px-2 py-1 text-sm">
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default DemoRequestsManagement;
