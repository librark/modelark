help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
	awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: ## Install NPM dependencies
	npm install

test: ## Run the project's tests
	npm run test

standard: ## Format the project source code with StandardJS
	npx standard --fix
