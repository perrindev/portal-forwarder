
const axios = require('axios');
const yaml = require('yaml');
const fs = require('fs');
const readline = require('readline');

// Load config
const config = yaml.parse(fs.readFileSync('config.yaml', 'utf8'));

const BASE_URL = config.apihost;
const JWT_API_URL = `${BASE_URL}/wp-json/jwt-auth/v1`;

async function getToken (username, password) {
  console.log('trying to create session');
  const authParams = {
    username: username,
    password: password
  };
  const resp = await axios.post(`${JWT_API_URL}/token`, authParams);
  const user = resp.data;
  return user.token;
}

// CLI handling
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  try {
    const username = await question('Username: ');
    const password = await question('Password: ');
    
    rl.close();
    
    const token = await getToken(username, password);
    console.log('Token (place this in config authKey):', token);
  } catch (error) {
    rl.close();
    console.error('Error getting token:', error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}