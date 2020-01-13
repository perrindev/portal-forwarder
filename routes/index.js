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

const BASE_URL = config.host;
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
  console.log("create session");
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
  console.log(`validate session`);
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
    res.send("select a /type[posts|pages]/<pageID>");
});

// LOAD WP RESOURCES
router.get('/:type/:pageID', async function (req, res, next) {

  if (!currentSessionValid) {
    return res.send('NO VALID SESSSION');
  }

  if (!req.params || !req.params.type) {
    return res.send('No type provided');
  }

  if (!req.params || !req.params.pageID) {
    return res.send('No pageID provided');
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
    res.render('index', { content: response.data.content.rendered });
  } catch (error) {
    console.log(error);
    res.send("TEST FAIL");
  }
});

init();

module.exports = router;