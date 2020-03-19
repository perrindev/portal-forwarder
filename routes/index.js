const fs = require('fs');
const YAML = require('yaml');
const express = require('express');
const router = express.Router();
const axios = require('axios');

const CONFIG_FILENAME = 'config.yaml';

let config = null;
try {
  const file = fs.readFileSync(CONFIG_FILENAME, 'utf8');
  config = YAML.parse(file);
} catch (error) {
  console.error(error);
  process.exit(1);
}

const BASE_URL = config.apihost;
const JWT_API_URL = `${BASE_URL}/wp-json/jwt-auth/v1`;
const API_URL = `${BASE_URL}/wp-json/wp/v2`;

let currentToken;
let currentSessionValid;

/**
 * Creates a new session
 *
 * @return  {String} The token
 */
async function createSession () {
  console.log('trying to create session');
  const authParams = {
    username: config.user,
    password: config.pass
  };
  const resp = await axios.post(`${JWT_API_URL}/token`, authParams);
  const token = resp.data;
  return token;
};

/**
 * Validate the current session
 *
 * @return  {Bool} True if valid, false if not
 */
async function validateSession (token) {
  console.log('trying to validate session');
  const request = {
    method: 'post',
    url: `${JWT_API_URL}/token/validate`,
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  
  let resp;
  try {
    resp = await axios(request);
  } catch (error) {
    console.error(error)
    return false;
  }

  return (resp && resp.data && resp.data.code === 'jwt_auth_valid_token');
};

/**
 * Initialize the wordpress connection
 *
 * @return  {void}
 */
async function init () {
  const response = await createSession();
  currentToken = response.token;
  currentSessionValid = await validateSession(currentToken);
  if (currentSessionValid) {
    console.log(`session created successfully`);
  } else {
    console.error(`session could not be created`);
  }
}

// DEFAULT ROUTE
router.get('/', async function (req, res, next) {
  return res.render('error', { message: 'Invalid request', error: {} });
});

// LOAD WP RESOURCES
router.get('/:type/:pageID', async function (req, res, next) {

  if (!currentSessionValid) {
    return res.render('error', { message: 'No open wordpress session', error: {} });
  }

  if (!req.params || !req.params.type) {
    return res.render('error', { message: 'Invalid request', error: {} });
  }

  if (!req.params || !req.params.pageID) {
    return res.render('error', { message: 'Invalid request', error: {} });
  }

  const request = {
    method: 'get',
    url: `${API_URL}/${req.params.type}/${req.params.pageID}`,
    headers: {
      Authorization: `Bearer ${currentToken}`
    }
  };
  
  try {
    const response = await axios(request);
    res.render('index', { 
      content: response.data.content.rendered,
      title: response.data.title.rendered
    });
  } catch (error) {
    res.render('error', { message: 'Failed to load content', error });
  }
});

init();

module.exports = router;