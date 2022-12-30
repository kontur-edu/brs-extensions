#!/bin/bash

export CONTAINER_REPOSITORY_NAME=cr.yandex/crprkhjar1gq4t8h8u0t/brs-extensions-proxy:latest
export SERVERLESS_CONTAINER_ID=bbamc5stve2edro7t455
export FOLDER_ID=b1gupi6tnkioua1397gl
export SA_ID=aje2oovtau2cioluf9tp


docker build -t ${CONTAINER_REPOSITORY_NAME} . ;
docker push ${CONTAINER_REPOSITORY_NAME};

yc sls container revisions deploy \
	--folder-id ${FOLDER_ID} \
	--container-id ${SERVERLESS_CONTAINER_ID} \
	--memory 256M \
	--cores 1 \
	--execution-timeout 30s \
	--concurrency 8 \
	--service-account-id ${SA_ID} \
	--image "${CONTAINER_REPOSITORY_NAME}";
