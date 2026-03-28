// Test environment setup — loaded before any test file via bunfig.toml
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-only';
process.env.NODE_ENV = 'test';
