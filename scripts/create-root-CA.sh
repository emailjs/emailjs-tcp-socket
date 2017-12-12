#!/usr/bin/env bash

DIR=$PWD

rm -f $DIR/crt/*.key $DIR/crt/*.pem $DIR/crt/*.csr

openssl genrsa -des3 -out $DIR/crt/rootCA.key 2048
openssl req -x509 -new -nodes -key $DIR/crt/rootCA.key -sha256 -days 1024 -out $DIR/crt/rootCA.pem
openssl req -new -sha256 -nodes -out $DIR/crt/server.csr -newkey rsa:2048 -keyout $DIR/crt/server.key -config <(cat $DIR/crt/server.csr.cnf)
openssl x509 -req -in $DIR/crt/server.csr -CA $DIR/crt/rootCA.pem -CAkey $DIR/crt/rootCA.key -CAcreateserial -out $DIR/crt/server.crt -days 500 -sha256 -extfile $DIR/crt/v3.ext
openssl x509 -text -in $DIR/crt/server.crt -noout
