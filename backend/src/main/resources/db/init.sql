-- Create database if not exists
CREATE DATABASE IF NOT EXISTS chatapp;

USE chatapp;

-- Create roles table if not exists
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(60) NOT NULL UNIQUE
);

-- Insert ROLE_USER if it doesn't exist
INSERT INTO roles (name) 
SELECT 'ROLE_USER' 
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_USER');