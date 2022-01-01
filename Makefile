help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
	awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: ## Install the project's dependencies
	npm install

test: ## Run the project's tests
	npm run test

standard: ## Format the project's source code with StandardJS
	npx standard --fix

push: ## Push git repository with its tags
	git push && git push --tags

gitmessage: ## Add .gitmessage file as git commit template
	touch .gitmessage
	echo "\n# commit message\n.gitmessage" >> .gitignore
	git config commit.template .gitmessage
