.PHONY: default build clean


default: clean build

build:
	@./node_modules/.bin/tsc --project tsconfig.build.json;
	@echo "'${@}' done"

clean:
	@find build \( -name '*.js' -or -name '*.map' -or -name '*.ts' \) -delete;
	@find build -type d ! -path build -delete
	@echo "'${@}' done"



