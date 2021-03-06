build:

npm: globals
	rm -rf node_modules/* || true
	npm install
	sudo npm link

globals:
	cp ../projectconfig/tsconfig-global-node.json ./tsconfig-global-node.json
#	cp ../projectconfig/Dockerfile.api-build ./Dockerfile.build

clean:
	rm -r lib/* || true

lint:
	npm run lint

build: clean lint
	npm run build
	npm run unittest

publish: build
	npm publish

test: build
	npm test

startdb:
	docker run -d -p 27017:27017 --name test-mongo my-mongo
