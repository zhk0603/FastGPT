docker build -f ./projects/app/Dockerfile -t hub.topevery.com/library/fastgpt/fastgpt:v4.8.9 . --build-arg name=app --build-arg proxy=taobao
docker push hub.topevery.com/library/fastgpt/fastgpt:v4.8.9