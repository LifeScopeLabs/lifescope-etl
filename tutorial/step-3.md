# 3. Setup Mongo Atlas and AWS services

This service requires a MongoDB instance to run.
We suggest creating a free instance of [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) to test things out.
When the free instance is created, click the 'Connect' button.
You'll need to whitelist the IP address(es) that will be connecting to it, or use 0.0.0.0/0 to allow all incoming traffic.
You'll have to copy the Connection URI into 'databases.mongo.address' in config/default.json, making sure to fill in the password and database name.
You can use 'admin' as the database name since our code specifies the 'live' database whenever it reads from or writes to Mongo.

You will also need to upload various portions of this project to Lambda, and you will create three SQS queues to facilitate communication between some of the Lambda functions.

#### Build Lambda functions
From the top level of the project run

```
gulp bundle:lambda
```

to zip up all of the Lambda functions.

#### Create SQS queues
Next we're going to create the SQS queues, as they need to be set up before some of the Lambda functions are created.

Go to [SQS](https://console.aws.amazon.com/sqs/home) and click on Create New Queue.
Name it 'live-jobs-dead-letter' and make sure it's a Standard Queue.
Click Quick Create Queue at the bottom of the page.
You should be taken back to the home page for SQS.
Create another queue, name this one 'live-jobs', and make sure it's also a Standard Queue.
Click on the Configure Queue button at the bottom instead of Quick Create.
Check 'Use Redrive Policy', set the Dead Letter Queue to 'live-jobs-dead-letter' and Maximum Receives to 5, then click Create Queue.
Finally, click on one of the queues and, under the Details tab, take note of its URL.
Get the URL for the other queue as well.

What this does is create a regular queue for scheduled jobs.
If a job fails 5 times, it gets sent to the dead letter queue.
If we wanted to do some analysis on failed jobs to figure out why they failed, we'd have a record of them in the dead letter queue.

Create a third queue called 'location-estimation', which should also be a Standard Queue.
You can use 'Quick Create Queue' for this one.
This queue will be used for estimating the Locations of Events for users from non-estimated Locations.

#### Create IAM role
Go to [IAM roles](https://console.aws.amazon.com/iam/home#/roles).
Create a new role and click the Select button next to AWS Lambda.
You'll want to search for and add four policies:

- AmazonSQSFullAccess
- AWSLambdaVPCAccessExecutionRole
- AWSLambdaBasicExecution
- AWSCloudFormationReadOnlyAccess

Click next step, name it something like 'Live', then create the role.

We're also going to need to create a custom policy and add it as well.
Go to Policies and create a new one.
Click Select next to Policy Generator.
From the dropdown for Service, select AWS Lambda.
Leave the Effect as 'Allow'.
After that, from the dropdown for Actions select InvokeFunction.
For Amazon Resource Name enter '*', then click Add Statement.
Finally, click Next Step, then give this policy a name like 'LambdaInvoke', then click Create Policy.
Go back to the 'Live' role and under the Permissions tab select Attach Policy.
Search for the LambdaInvoke policy you just made, check it, then click Attach Policy.

#### Create Lambda functions
Next we're going to creating six lambda functions for some recurring tasks that will be run, as well as a migration script.
Follow this general flow for each of them, paying attention to instructions specific to a given function.
You must create a 'worker' function before the corresponding 'consumer' function, as the latter needs the ARN of the former as an Environment Variable.

Go to https://console.aws.amazon.com/lambda/home and click ‘Create a Lambda function’. Make sure you are in the eu-west-1, us-east-1, or us-west-2 regions.

For the blueprint select ‘Blank Function’.

For generator and consumer functions, you will want to create a Trigger of type 'CloudWatch Events'.
The Rule type should be 'Schedule expression'.
We suggest that the expression for these triggers be 'rate(1 minute)', though you can go higher if you want.
When you create a rule for the first function, it will be saved under the name you gave it; for the second function, you can just select that rule instead of creating a new one.
Make sure to check 'Enable trigger' for each function that has a trigger, then click Next.

If this is the migrations or worker function, don't add a trigger, just click Next.

Name the function whatever you want and set the runtime to Node.js 6.10.

For Code Entry Type click the dropdown and select ‘Upload a .ZIP file’, then click on the Upload button that appears.
Navigate to the dist/ directory in this project and select the .zip file that corresponds to the function you're uploading.
The Handler should be ‘index.handler’.

You will need to add Environment Variables specific to each function:

##### live-migrations
- MONGO_ADDRESS (obtained from Mongo Atlas instance)

##### live-generator
- MONGO_ADDRESS (obtained from Mongo Atlas instance)
- QUEUE_URL (obtained from SQS queue)

##### live-worker
- MONGO_ADDRESS (obtained from Mongo Atlas instance)
- QUEUE_URL (obtained from SQS queue)
- BITSCOOP_API_KEY (obtainable at https://bitscoop.com/keys)
- DEAD_LETTER_QUEUE_URL (obtained from SQS dead letter queue)

##### live-consumer
- MONGO_ADDRESS (obtained from Mongo Atlas instance)
- QUEUE_URL (obtained from SQS queue)
- WORKER_FUNCTION_ARN (ARN of the worker function, found in the top right corner of its details page)

##### location-estimation-generator
- MONGO_ADDRESS (obtained from Mongo Atlas instance)
- QUEUE_URL (obtained from SQS queue)

##### location-estimation-worker
- MONGO_ADDRESS (obtained from Mongo Atlas instance)
- QUEUE_URL (obtained from SQS queue)

##### location-estimation-consumer
- MONGO_ADDRESS (obtained from Mongo Atlas instance)
- QUEUE_URL (obtained from SQS queue)
- WORKER_FUNCTION_ARN (ARN of the worker function, found in the top right corner of its details page)

For the Role, use the 'Live' role that we created earlier.

Open the Advanced Settings accordion.
You’ll want to set the Timeout to 15 seconds.
Make sure that VPC is set to ‘No VPC’.
Hit next and you’ll be taken to a review screen, and then select ‘Create Function’ at the very bottom of the page.

You will also need to run the migrations function to set up the Mongo instance properly.
You can do this by clicking the Test button when looking at that function's page, then clicking Save and Test.
The sample event doesn't matter since the script doesn't use any information from the event it's passed.
This only needs to be run once, so you shouldn't set up any triggers.
