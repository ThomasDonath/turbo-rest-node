build:

npm:
	rm -rf node_modules/* || true
	npm install

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
