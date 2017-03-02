const bbAuth = process.env.REACT_APP_BB_AUTH;

export default function fetchBitbucket(endpoint) {
  const url = endpoint.startsWith('https://') ? endpoint : `https://api.bitbucket.org/2.0/${endpoint}`;
  return fetch(
    url,
    {
      'headers': {
        Authorization: `Basic ${bbAuth}`,
      },
    }
  );
}

