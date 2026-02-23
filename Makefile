.PHONY: validate init-skill

validate:
	bash scripts/validate-skills.sh

init-skill:
	@echo "Usage: make init-skill NAME=<skill-name> DESC=\"<description>\" OWNER=<chalk|project>"
	@test -n "$(NAME)" || (echo "NAME is required" && exit 1)
	@test -n "$(DESC)" || (echo "DESC is required" && exit 1)
	@OWNER_VAL=$${OWNER:-project}; \
	bash scripts/init-skill.sh "$(NAME)" --description "$(DESC)" --owner "$$OWNER_VAL"
