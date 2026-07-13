# proposed architecture



# frontend client : nextJS



# Api server : Hono api 



## Frontend client and hono api should communicate over hono rpc 
## use shared typelayer between nexts and hono



# async worker document processing : python 
## Extract

## chunk

## embed


# Agent Langgraph : python

# React master agent

## tools 
-  Query embeddings


# Databse : postgressql with pgvector

- everything should be mapped to orgs 
- members  will have roles over orgs
- dedicate tables for documents with types 
- dedicated table for document chunks with metadata and embediing vectors via pg vectors

# communication

rabbit mq for task delivery 

streaming agent reponses redis
