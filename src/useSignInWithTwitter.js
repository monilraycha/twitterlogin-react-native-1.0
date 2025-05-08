import Axios from 'axios';
import OAuth from 'oauth-1.0a';
import {useEffect} from 'react';
import {Alert, Linking} from 'react-native';
import crypto from 'react-native-quick-crypto';

const CONSUMER_KEY = 'LwOanmx2EH0oPb8WK1BXVWnKA';
const CONSUMER_SECRET = 'QMPP6ZdY5jHsEYbMhuvbSXi3qaUNkxhhEa5ura7dys4IyzhMU8';
const TWITTER_API = 'https://api.twitter.com';
const OAUTH_CALLBACK_URL = 'oauth-app://oauth';

export const useSignInWithTwitter = () => {
  const signInWithTwitter = async () => {
    const oauth = new OAuth({
      consumer: {key: CONSUMER_KEY, secret: CONSUMER_SECRET},
      signature_method: 'HMAC-SHA1',
      hash_function: (baseString, key) =>
        crypto.createHmac('sha1', key).update(baseString).digest('base64'),
    });

    const request_data = {
      url: TWITTER_API + '/oauth/request_token',
      method: 'POST',
      data: {oauth_callback: OAUTH_CALLBACK_URL},
    };

    try {
      const res = await Axios.post(
        request_data.url,
        {},
        {headers: {...oauth.toHeader(oauth.authorize(request_data))}},
      );

      const responseData = res.data;
      const requestToken = responseData.match(/oauth_token=([^&]+)/)[1];
      const twitterLoginURL =
        TWITTER_API + `/oauth/authenticate?oauth_token=${requestToken}`;
      Linking.openURL(twitterLoginURL);
    } catch (error) {
      console.log('Axios error ------', error);
    }
  };

  useEffect(() => {
    const handleUrl = async event => {
      const url = event.url;
      const params = url.split('?')[1];
      const tokenParts = params.split('&');
      const requestToken = tokenParts[0].split('=')[1];
      const oauthVerifier = tokenParts[1].split('=')[1];

      const oauth = new OAuth({
        consumer: {key: CONSUMER_KEY, secret: CONSUMER_SECRET},
        signature_method: 'HMAC-SHA1',
        hash_function: (baseString, key) =>
          crypto.createHmac('sha1', key).update(baseString).digest('base64'),
      });

      const request_data = {
        url: TWITTER_API + '/oauth/access_token',
        method: 'POST',
        data: {
          oauth_token: requestToken,
          oauth_verifier: oauthVerifier,
        },
      };

      try {
        const res = await Axios.post(
          request_data.url,
          {},
          {headers: {...oauth.toHeader(oauth.authorize(request_data))}},
        );

        const responseData = res.data;
        const authToken = responseData.match(/oauth_token=([^&]+)/)[1];
        const authTokenSecret = responseData.match(
          /oauth_token_secret=([^&]+)/,
        )[1];

        const userOauth = new OAuth({
          consumer: {key: CONSUMER_KEY, secret: CONSUMER_SECRET},
          signature_method: 'HMAC-SHA1',
          hash_function: (baseString, key) =>
            crypto.createHmac('sha1', key).update(baseString).digest('base64'),
        });

        const userRequestData = {
          url: `${TWITTER_API}/1.1/account/verify_credentials.json?include_email=true`,
          method: 'GET',
        };

        const userRes = await Axios.get(userRequestData.url, {
          headers: {
            ...userOauth.toHeader(
              userOauth.authorize(userRequestData, {
                key: authToken,
                secret: authTokenSecret,
              }),
            ),
          },
        });

        const userData = userRes.data;

        Alert.alert(
          'Twitter Login Success',
          `Name: ${userData.name}\nEmail: ${userData.email || 'Not available'}`,
        );

        console.log('User Data:', userData);
      } catch (error) {
        console.log('Error: access token or user fetch', error);
      }
    };

    const subscribe = Linking.addEventListener('url', handleUrl);

    return () => subscribe.remove();
  }, []);

  return {
    signInWithTwitter,
  };
};
