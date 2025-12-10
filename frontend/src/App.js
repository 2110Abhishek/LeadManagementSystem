import React, { useState } from 'react';
import LeadList from './components/LeadList';
import ImportLeads from './components/ImportLeads';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('list');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="gradient-text">🏆 Lead Management Pro</h1>
            <p className="header-subtitle animated-subtitle">
              Streamline your lead management with our powerful tools
            </p>
          </div>
          
          <div className="header-right">
            {/* Mobile Menu Toggle */}
            <button 
              className="mobile-menu-toggle"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="menu-icon">☰</span>
            </button>
            
            {/* Navigation */}
            <nav className={`nav-tabs ${isMenuOpen ? 'open' : ''}`}>
              <button
                className={`tab-btn ${activeTab === 'list' ? 'active pulse' : ''}`}
                onClick={() => {
                  setActiveTab('list');
                  setIsMenuOpen(false);
                }}
              >
                <span className="tab-icon">📋</span>
                <span className="tab-text">Lead Dashboard</span>
                <span className="active-indicator"></span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'import' ? 'active pulse' : ''}`}
                onClick={() => {
                  setActiveTab('import');
                  setIsMenuOpen(false);
                }}
              >
                <span className="tab-icon">📥</span>
                <span className="tab-text">Import Leads</span>
                <span className="active-indicator"></span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="content-wrapper">
          {activeTab === 'list' && <LeadList />}
          {activeTab === 'import' && <ImportLeads />}
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-left">
            <span className="footer-text">
              © {new Date().getFullYear()} Lead Management System
            </span>
          </div>
          <div className="footer-right">
            <div className="status-indicator">
              <span className="status-dot pulse-glow"></span>
              <span className="status-text">All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;