# 1. Install Docker

This tutorial assumes a unix based system, and is written on an OSX system
Install docker

go to https://docs.docker.com/engine/installation/ and install docker on your system.


# 2. Install AWS SAM local

Note: this will install SAM local globaly on your system
`npm install -g aws-sam-local`

Check the install using
`sam --version`

The template file and the environment variables file are locate in the lambda/local folder of the project.

# 3. Install ElasticMQ as mock SQS

You can download file distribution here: https://s3/.../elasticmq-server-0.13.8.jar
place the JAR file in the SQS folder of the project

# 4.Run the SQS server

in a new shell run the following at the top level of the project
`java -D config.file=SQS/sqs_config/lifescopeSQS.conf -jar SQS/elasticmq-server-0.13.8.jar`

# 4. Running SAM local

In order to begin running the local Lambda function run the following code in the top level directory of the project

`sam local start-api -t lambda/local/template.yml --env-vars lambda/local/environmentVars.json`

you will then be shown the urls to your lambda functions along with their port numbers.


# Thank You
ADAMW ElasticMQ - https://github.com/adamw/elasticmq
