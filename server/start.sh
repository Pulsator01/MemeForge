docker build -t memegents:v1 . --debug --platform=linux/amd64
docker tag memegents:v1 arnavmehta7/memegents:v1
docker push arnavmehta7/memegents:v1
