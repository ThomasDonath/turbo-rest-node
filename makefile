build:

npm: globals
	rm -rf node_modules/* || true
	npm install

globals:
	cp ../projectconfig/tsconfig-global-node.json ./tsconfig-global-node.json
#	cp ../projectconfig/Dockerfile.api-build ./Dockerfile.build

clean:
	rm -r lib/* || true

lint:
	npm run lint

build: clean lint
	npm run build

pack: build
	npm pack
#	npm publish

securityCheck:
	retire --path .

test: build
	npm test

startdb:
	docker run -d -p 27017:27017 --name test-mongo my-mongo
