import React, { useState } from 'react';
import axios from 'axios';
import { Upload, AlertTriangle, CheckCircle, Info } from 'lucide-react';

function App() {
  const [file, setFile] = useState(null);
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
try {
  const API_URL = import.meta.env.VITE_API_URL;

  const response = await axios.post(
    `${API_URL}/api/import`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
      setReport(response.data.report);
      setImportedCount(response.data.importedCount);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem' }}>
        <h1 style={{ color: '#2563eb' }}>            Expenses App</h1>
        <p style={{ color: '#4b5563' }}>Upload your expenses sheet to analyze and import data.</p>
      </header>

      <div style={{ marginBottom: '2rem', padding: '1rem', border: '2px dashed #ccc', borderRadius: '8px', textAlign: 'center' }}>
        <input type="file" accept=".csv" onChange={handleFileChange} style={{ marginBottom: '1rem' }} />
        <br />
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: file ? '#2563eb' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: file && !loading ? 'pointer' : 'not-allowed'
          }}
        >
          {loading ? 'Processing...' : 'Upload & Process CSV'}
        </button>
      </div>

      {importedCount > 0 && (
        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
          <CheckCircle color="#16a34a" style={{ marginRight: '0.5rem' }} />
          <span style={{ color: '#166534', fontWeight: 'bold' }}>Successfully imported {importedCount} expenses!</span>
        </div>
      )}

      {report.length > 0 && (
        <div>
          <h2>Import Anomaly Report</h2>
          <p>The following issues were detected during import. Actions have been taken according to our handling policies.</p>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>Row</th>
                <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>Issue Detected</th>
                <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>Action Taken</th>
              </tr>
            </thead>
            <tbody>
              {report.map((item, index) => (
                <tr key={index}>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'center' }}>{item.row}</td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#b91c1c' }}>
                      <AlertTriangle size={16} style={{ marginRight: '0.5rem' }} />
                      {item.issue}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#0369a1' }}>
                      <Info size={16} style={{ marginRight: '0.5rem' }} />
                      {item.action}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
