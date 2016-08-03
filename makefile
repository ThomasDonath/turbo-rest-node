npm:
	rm -rf node_modules/* || true
	rm -rf typings/* || true
	npm install

clean:
	rm -r dist/* || true

lint: 
	npm run lint    

build: clean lint
	npm run build

pack: build
	npm pack

securityCheck:
	retire --path .

