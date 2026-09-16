# Releasing SDKs

The version in `package.json` and `pyproject.toml` must match. Update both, add a changelog entry, run tests, commit and push `main`, then tag that exact commit `vX.Y.Z`.

`release.yml` verifies the versions, tests installed package artifacts, builds the npm tarball, Python wheel and source distribution, and attaches them to a GitHub release. It never publishes the backend.

## npm publication

`expectbox-agents` is already published on npm. The package includes the SDK and the `expectbox-mcp` executable; no second npm package is required. The release workflow tests the MCP script from the installed tarball as well as from source.

Until trusted publishing is configured, publish the exact tested tarball from the GitHub release with the owner's authenticated npm account:

```sh
gh release download v0.2.0 --pattern 'expectbox-agents-*.tgz' --dir dist
npm publish dist/expectbox-agents-0.2.0.tgz --access public
npm view expectbox-agents version bin
npx -y expectbox-agents@0.2.0 --version
```

Browser authentication or 2FA may be required. Do not put credentials in Git or chat. Verify the new registry version and executable before deploying pages that advertise the command.

## Optional automated registry setup

### npm

1. In the existing package's npm settings, add a GitHub Actions trusted publisher: owner `simon86pl`, repository `expectbox-sdk`, workflow filename `release.yml`, environment `npm`. Allow direct publishing.
2. Set GitHub repository variable `NPM_PUBLISH_ENABLED=true` only after configuring the trusted publisher. Subsequent tags publish using OIDC; there is no long-lived npm token in CI.

### PyPI

1. In your PyPI account, add a **pending trusted publisher** for project `expectbox-agents`: owner `simon86pl`, repository `expectbox-sdk`, workflow `release.yml`, environment `pypi`.
2. Set GitHub repository variable `PYPI_PUBLISH_ENABLED=true`. A new tag publishes using OIDC. The first successful upload creates the project.

Enable registry publishing before tagging the next version. Registry jobs fail on an already published version; never overwrite an existing release or reuse a version for different code.

Before tagging, protect `main`, limit who can create version tags, and consider required reviewers on `npm`/`pypi` GitHub environments.

Official setup references: [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/), [PyPI pending publishers](https://docs.pypi.org/trusted-publishers/creating-a-project-through-oidc/).
