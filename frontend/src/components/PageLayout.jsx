import React from 'react'

/**
 * PageLayout Component
 * Provides consistent layout for all pages
 */
function PageLayout({ children, title, subtitle, onBack }) {
  return (
    <div className="page-layout">
      {/* Header */}
      <header className="page-layout-header">
        <div className="header-left">
          {onBack && (
            <button
              className="back-button"
              onClick={onBack}
              title="Go back"
            >
              <span className="back-icon">←</span>
              <span className="back-text">Back</span>
            </button>
          )}
          {title && <h1 className="page-title">{title}</h1>}
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-avatar">👤</span>
            <span className="user-name">Admin</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-layout-main">
        {children}
      </main>

      {/* Footer */}
      <footer className="page-layout-footer">
        <p>© 2024 Pipeline Management System. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default PageLayout