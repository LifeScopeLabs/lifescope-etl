# 2. Install dependencies and fill in Remote Map IDs

From the top level of this directory run

`npm install`

to install all of the project-wide dependencies, then go to each sub-directory in the 'lambda' folder ('consumer', 'generator', 'migrations', and 'worker') and run

`npm install`

to install the dependencies for each Lambda function that we will be setting up shortly.

Next, go to lambda/migrations/fixtures/providers and open up each JSON file.
You will need to copy the ID of the API Map you made for each service into the 'remote_provider_id' field in the corresponding provider file.
