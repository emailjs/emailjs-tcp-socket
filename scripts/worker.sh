#!/bin/bash

rm $PWD/res/tls.worker.blob
webpack -p
mv $PWD/res/tls.worker.js $PWD/res/tls.worker.blob
