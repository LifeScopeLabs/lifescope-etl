# 4. Using LIFESCOPE

Sign up using a GitHub, Google, or Twitter account.

At the start, Live does not have any of your data.
You will need to create Connections for each service from which you want to pull in data.
Go to /providers on the site, either manually or by clicking the plug icon in the header or menu.

You should see several boxes, one for each service.
Click on the box for a service, and it will ask you what data you want to retrieve.
By default all of the data sources are checked, but you can de-select them if there's something you don't want Live to get.
You can also give the Connection a name; if you don't, it will generate one automatically from some identifying information about your account with that service.
When you're ready, click 'Connect to <service>'.
You should be taken to the authorization page for that service.
Select which account you want to authorize (if appropriate) and give Live authorization to access your account.
You should automatically be redirected back to /providers, at which point you should see the box of the service you just connected turn blue.

Within a few minutes, the Lambda functions we set up should have finished retrieving your data.
At that point, you can go to /explore, either manually or by clicking the rocketship icon in the header or menu.
You should see cards with your data.

Live breaks down data into several discrete parts.
Everything is an 'Event', which has a Datetime, Type, Provider, Connection, Context, and more.
An Event can have one of a few subtypes, primarily Contacts and Content.
Contacts are the people involved with that Event, and have a name and/or a handle.
Content are discrete digital things, such as a piece of text, and image, or a file; Content always has a Type, and can have fields such as Title, Text, Embed Content depending on what type of Content it is.
Events can have multiple Contacts and Content; for example, a Tweet with a video would have separate Content for the text and the video.

Live allows you to perform text searches on the Events and their associated Content and Contacts, as well as filtering your information by Contact, Content Type, Date, and Provider/Connection.
These search options are not additive - filtering by 'Tom' and setting a date of 'Exactly 10 days ago' will return both items from anyone named Tom AND items from exactly 10 days ago.
