# 1 . Create accounts, add API maps to BitScoop, and set up authorization
You will need to obtain developer accounts and/or API keys for each of the services listed below that you wish to use. Steam does not have a developer account, but

For each API, you will add an API Map to your BitScoop account using the “Add to BitScoop” buttons. You can either enter any required API keys and User information when you create the map or edit the source of that map later.

You need to create a BitScoop account via (https://bitscoop.com/signup) as well as an AWS account.
For the sake of brevity we will not cover the specifics here. Learn BitScoop (especially connections) and AWS. 

## Add API Maps to BitScoop

To quickly get started with what you'll need on BitScoop, you can add the following API Maps using the buttons below.
Make sure to substitute the values for the API keys, client IDs, and client secrets where appropriate.

| API Map   | File Name       |                                                                                                                                                                                                                                    |
|----------------|-----------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Dropbox | dropbox.json | [![Add to BitScoop](https://assets.bitscoop.com/github/AddBitScoopXSmall.png)](https://bitscoop.com/maps/create?source=https://raw.githubusercontent.com/bitscooplabs/bitscoop-social-app-demo/master/fixtures/maps/dropbox.json) |
| Facebook | facebook.json | [![Add to BitScoop](https://assets.bitscoop.com/github/AddBitScoopXSmall.png)](https://bitscoop.com/maps/create?source=https://raw.githubusercontent.com/bitscooplabs/bitscoop-social-app-demo/master/fixtures/maps/facebook.json) |
| GitHub | github.json | [![Add to BitScoop](https://assets.bitscoop.com/github/AddBitScoopXSmall.png)](https://bitscoop.com/maps/create?source=https://raw.githubusercontent.com/bitscooplabs/bitscoop-social-app-demo/master/fixtures/maps/github.json) |
| Google | google.json | [![Add to BitScoop](https://assets.bitscoop.com/github/AddBitScoopXSmall.png)](https://bitscoop.com/maps/create?source=https://raw.githubusercontent.com/bitscooplabs/bitscoop-social-app-demo/master/fixtures/maps/google.json) |
| Instagram | instagram.json | [![Add to BitScoop](https://assets.bitscoop.com/github/AddBitScoopXSmall.png)](https://bitscoop.com/maps/create?source=https://raw.githubusercontent.com/bitscooplabs/bitscoop-social-app-demo/master/fixtures/maps/instagram.json) |
| Pinterest | pinterest.json | [![Add to BitScoop](https://assets.bitscoop.com/github/AddBitScoopXSmall.png)](https://bitscoop.com/maps/create?source=https://raw.githubusercontent.com/bitscooplabs/bitscoop-social-app-demo/master/fixtures/maps/pinterest.json) |
| reddit | reddit.json | [![Add to BitScoop](https://assets.bitscoop.com/github/AddBitScoopXSmall.png)](https://bitscoop.com/maps/create?source=https://raw.githubusercontent.com/bitscooplabs/bitscoop-social-app-demo/master/fixtures/maps/reddit.json) |
| Spotify | spotify.json | [![Add to BitScoop](https://assets.bitscoop.com/github/AddBitScoopXSmall.png)](https://bitscoop.com/maps/create?source=https://raw.githubusercontent.com/bitscooplabs/bitscoop-social-app-demo/master/fixtures/maps/spotify.json) |
| Steam | steam.json | [![Add to BitScoop](https://assets.bitscoop.com/github/AddBitScoopXSmall.png)](https://bitscoop.com/maps/create?source=https://raw.githubusercontent.com/bitscooplabs/bitscoop-social-app-demo/master/fixtures/maps/steam.json) |
| Twitter | twitter.json | [![Add to BitScoop](https://assets.bitscoop.com/github/AddBitScoopXSmall.png)](https://bitscoop.com/maps/create?source=https://raw.githubusercontent.com/bitscooplabs/bitscoop-social-app-demo/master/fixtures/maps/twitter.json) |


### Dropbox
On our [GitHub page](https://github.com/bitscooplabs/bitscoop-social-app-demo/tree/master/fixtures/maps), click the ‘Add to BitScoop’ button next to the map for Dropbox. You will be redirected to BitScoop. (Make sure you are logged in on BitScoop.) You will see the JSON for the map you just added. You do not need to add any information to this map. Click the ‘+ Create’ button in the upper right-hand corner to save the map.

Create an account with Dropbox if you don't have one already.
When you're signed in, go to [your developer apps page](https://www.dropbox.com/developers/apps).
Create a new app; it should be for the Dropbox API (not the Business API) and should have full Dropbox access.
Give it a name and click Create; you should be taken to the Settings page for the new app.
On the settings page, you need to copy the Callback URL from the API Map you made into 'OAuth2 Redirect URIs'; amke sure to click the Add button.
Copy the App key and App secret into 'auth_key' and 'auth_secret', respectively, in the 'auth' portion of the Map, then save the Map.

#### Facebook
On our [GitHub page](https://github.com/bitscooplabs/bitscoop-social-app-demo/tree/master/fixtures/maps), click the ‘Add to BitScoop’ button next to the map for Facebook. You will be redirected to BitScoop. (Make sure you are logged in on BitScoop.) You will see the JSON for the map you just added. You do not need to add any information to this map. Click the ‘+ Create’ button in the upper right-hand corner to save the map.

Create a developer account with Facebook if you don’t have one already.
When you’re signed in, go to [your apps page](https://developers.facebook.com/apps).
Click on Add a New App.
Enter a name for this app and click Create App ID, then solve the Captcha if asked.
You should be taken to the Add Product page for the new app.

Click the ‘Get Started’ button for Facebook Login.
This should add it to the list of Products at the bottom of the left-hand menu.
We don’t need to go through their quickstart, so click on the Login product and then go to its Settings.
Copy the Map’s Callback URL into ‘Valid OAuth redirect URIs’ and make sure to Save Changes.
Now go to the app’s Basic Settings and copy the App ID and App Secret into ‘auth_key’ and ‘auth_secret’, respectively, in the auth portion of the Map, then save the Map.

# GitHub
On our [GitHub page](https://github.com/bitscooplabs/bitscoop-social-app-demo/tree/master/fixtures/maps), click the ‘Add to BitScoop’ button next to the map for GitHub. You will be redirected to BitScoop. (Make sure you are logged in on BitScoop.) You will see the JSON for the map you just added. You do not need to add any information to this map. Click the ‘+ Create’ button in the upper right-hand corner to save the map.

Create an account with GitHub if you don’t have one already.
When you’re signed in, go to [your developer settings page](https://github.com/settings/developers).
Click on Register a New Application.
Enter a name and homepage URL, and copy the Callback URL from the API Map you made into ‘Authorization callback URL’.
Click Register Application.
You should be taken to the settings for the application you just made.
Go back to the details for the API Map and click ‘Source’ in the upper right to edit the Map.
Copy the Client ID and Client Secret from the GitHub application into ‘auth_key’ and ‘auth_secret’, respectively, in the ‘auth’ portion of the Map, then save the Map.

Repeat the above steps starting with registering a new application to make a separate application and Map for GitHub Login.
GitHub does not allow for multiple callback URLs on the same application, so for simplicity we're using one Map for Login and another Map for retrieving data.

 - GitHub API Documentation https://developer.github.com/

# Google
On our [GitHub page](https://github.com/bitscooplabs/bitscoop-social-app-demo/tree/master/fixtures/maps), click the ‘Add to BitScoop’ button next to the Map for Google. You will be redirected to BitScoop. (Make sure you are logged in to BitScoop.) You will see the JSON for the map you just added. We don’t have an auth_key or auth_secret yet, so leave those fields as is. Then click the ‘+ Create’ button in the upper right-hand corner to save the map.

Create an account with Google if you don't have one already.
Go to the Google API Console for [People](https://console.developers.google.com/apis/api/people.googleapis.com/overview), [Drive](https://console.developers.google.com/apis/api/drive.googleapis.com/overview) and [Gmail](https://console.developers.google.com/apis/api/gmail.googleapis.com/overview) and make sure all are enabled.
Next click on ‘Credentials’ on the left-hand side, underneath ‘Dashboard’ and ‘Library’. Click on the blue button ‘Create Credentials’ and select ‘OAuth client id’.
Choose application type ‘Web application’, then in ‘Authorized redirect URIs’ enter the Callback URL that can be found on the Details page for the API Map you created for Google Analytics; it should be in the form https://auth.api.bitscoop.com/done/<map_id>.
Click ‘Create’ twice; it should show a pop-up with your client ID and secret. These will be entered in the API Map as the auth_key and auth_secret, respectively, in the ‘auth’ portion of the map.

Create another Map for Google Login.
Unlike GitHub and Twitter, Google allows for multiple callback URLs for the same set of credentials, so all we have to do is enter the Login Map's Callback URL alongside the main Map's Callback URL.

- Google Analytics API Documentation:

 https://developers.google.com/analytics/
- Google API Console for Analytics:

 https://console.developers.google.com/apis/api/analytics.googleapis.com/overview

# Instagram
On our [GitHub page](https://github.com/bitscooplabs/bitscoop-social-app-demo/tree/master/fixtures/maps), click the ‘Add to BitScoop’ button next to the Map for Instagram. You will be redirected to BitScoop. (Make sure you are logged in to BitScoop.) You will see the JSON for the map you just added. We don’t have an auth_key or auth_secret yet, so leave those fields as is. Then click the ‘+ Create’ button in the upper right-hand corner to save the map.

Create an account with Instagram if you don't have one already.
Go to the [Instagram Developer Client Management](https://www.instagram.com/developer/clients/manage) and click on Register a New Client.
Fill in the required fields, in particular copying the Callback URL from the API Map you made into 'Valid Redirect URIs', then click Register.
When the client is created, click Manage and copy the Client ID and Client Secret into auth_key and auth_secret in the 'auth' portion of your Instagram Map. Make sure to save the Map.

### Pinterest
On our [GitHub page](https://github.com/bitscooplabs/bitscoop-social-app-demo/tree/master/fixtures/maps), click the ‘Add to BitScoop’ button next to the Map for Pinterest. You will be redirected to BitScoop. (Make sure you are logged in to BitScoop.) You will see the JSON for the map you just added. We don’t have an auth_key or auth_secret yet, so leave those fields as is. Then click the ‘+ Create’ button in the upper right-hand corner to save the map.

Create an account with Pinterest if you don't have one already.
Go to [your developer apps](https://developers.pinterest.com/apps/) and create a new app; give it a name and description and click Create.
Go to the app's settings once it's created and, under Web, enter the Callback URL from the Map under 'Redirect URIs' and make sure it's saved.
Then, copy the App ID and App secret into 'auth_key' and 'auth_secret', respectively, in the 'auth' portion of the Map, then save the Map.

# reddit
On our [GitHub page](https://github.com/bitscooplabs/bitscoop-social-app-demo/tree/master/fixtures/maps), click the ‘Add to BitScoop’ button next to the Map for reddit. You will be redirected to BitScoop. (Make sure you are logged in to BitScoop.) You will see the JSON for the map you just added. We don’t have an auth_key or auth_secret yet, so leave those fields as is. Then click the ‘+ Create’ button in the upper right-hand corner to save the map.

Create an account with reddit if you don't have one already.
Go to [your reddit app preferences](https://www.reddit.com/prefs/apps/), scroll down to 'developed applications', and click on the button to create an app.
Give it a name, make sure 'web app' is selected for the type, and copy the Callback URL from the API Map you made into 'redirect uri', then click 'create app'.
When it's created, click the 'edit' link inside of the app.
Copy the string to the right of the icon into 'auth_key' and also copy the 'secret' into 'auth_secret' in the 'auth' block in the reddit Map. Make sure to save the Map.

# Spotify
On our [GitHub page](https://github.com/bitscooplabs/bitscoop-social-app-demo/tree/master/fixtures/maps), click the ‘Add to BitScoop’ button next to the Map for Spotify. You will be redirected to BitScoop. (Make sure you are logged in to BitScoop.) You will see the JSON for the map you just added. We don’t have an auth_key or auth_secret yet, so leave those fields as is. Then click the ‘+ Create’ button in the upper right-hand corner to save the map.

Create an account with Spotify if you don't have one already.
Go to [your Spotify Developer applications](https://developer.spotify.com/my-applications/#!/applications) and create a new app.
When it's created, copy the Redirect URL from the map you made into 'Reirect URIs'. Make sure to save the application.
Copy the Client ID and Client Secret into 'auth_key' and 'auth_secret' in the 'auth' block in the Spotify Map. Make sure to save the Map.

# Steam
On our [GitHub page](https://github.com/bitscooplabs/bitscoop-social-app-demo/tree/master/fixtures/maps), click the ‘Add to BitScoop’ button next to the Map for Steam. You will be redirected to BitScoop. (Make sure you are logged in to BitScoop.) You will see the JSON for the map you just added. We don’t have an auth_key or auth_secret yet, so leave those fields as is. Then click the ‘+ Create’ button in the upper right-hand corner to save the map.

Create an account with Steam if you don't have one already.
Go to [your Steam API key page](http://steamcommunity.com/dev/apikey) and create an API key.
Copy this into 'auth_key' in the 'auth' block in the API Map. Make sure to save the Steam Map.

# Twitter
On our [GitHub page](https://github.com/bitscooplabs/bitscoop-social-app-demo/tree/master/fixtures/maps), click the ‘Add to BitScoop’ button next to the Map for Twitter. You will be redirected to BitScoop. (Make sure you are logged in to BitScoop.) You will see the JSON for the map you just added. We don’t have an auth_key or auth_secret yet, so leave those fields as is. Then click the ‘+ Create’ button in the upper right-hand corner to save the map.

Create an account with Twitter if you don't have one already.
Go to [your Twitter apps](https://apps.twitter.com) and create a new app.
Fill in the required fields and copy the Callback URL from the API Map you made for Twitter into 'Callback URL'.
Check the box to agree to the Developer Agreement and click the Create button.
Click on the app that was just created.
Click on the Permissions tab and select the 'Read, Write, and Access direct messages' option, then click 'Update Settings'.
Click on the 'Keys and Access Tokens' tab and copy the Consumer Key and Consumer Secret into 'auth_key' and 'auth_secret' in the 'auth' portion of your Twitter Map. Make sure to save the map.

Repeat the above steps starting with creating a new app to make a separate application and Map for Twitter Login.
Twitter does not allow for multiple callback URLs on the same application, so for simplicity we're using one Map for Login and another Map for retrieving data.


# Download Tools

- Atom Editor with Teletype
- Mongo Compass  - Mongo Atlas reccomended
