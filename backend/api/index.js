/**
 * Vercel Serverless Entry Point
 * Wraps the Express app for Vercel's serverless environment
 */

const app = require('../app');

module.exports = app;
