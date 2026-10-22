-- Creates the dedicated database used by the API integration test suite.
-- Executed automatically by the postgres image on first container start.
SELECT 'CREATE DATABASE miniledger_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'miniledger_test')\gexec
