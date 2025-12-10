-- Create database
CREATE DATABASE IF NOT EXISTS lead_management;
USE lead_management;

-- Table
CREATE TABLE leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leadId VARCHAR(20) NOT NULL UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(20) NOT NULL UNIQUE,
  enquiry_for ENUM('Samsung','Apple','Pixel') NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  rejection_reason TEXT NULL,
  agent_id INT NULL,
  agent_name VARCHAR(255) NULL,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sample data
INSERT INTO leads 
(leadId, customer_name, mobile_number, enquiry_for, status, agent_id, agent_name, rejection_reason)
VALUES
('LD20240101-001', 'Ramesh Kumar', '9876543210', 'Samsung', 'pending', 101, 'Ajay Singh', NULL),
('LD20240101-002', 'Priya Mehta', '9988776655', 'Apple', 'approved', 102, 'Rohan', NULL),
('LD20240101-003', 'John Mathew', '9123456780', 'Pixel', 'rejected', 103, 'Sneha', 'Wrong details');


