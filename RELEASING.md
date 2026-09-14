# Releasing SDKs

The version in `package.json` and `pyproject.toml` must match. Update both, add a changelog entry, run tests, commit and push `main`, then tag that exact commit `vX.Y.Z`.

`release.yml` verifies the versions, tests installed package artifacts, builds the npm tarball, Python wheel and source distribution, and attaches them to a GitHub release. It never publishes the backend.

## One-time registry setup

The initial release is installable directly from GitHub. npm/PyPI jobs remain disabled until the repository owner completes their registry setup.

### npm

1. Sign into the intended publishing account with `npm login` locally. Never put credentials in Git or a chat.
2. Verify the package name `expectbox-agents` is available. Publish the reviewed first tarball using `npm publish ./expectbox-agents-0.1.0.tgz --access public` (2FA may be required).
3. In that package's npm settings, add a GitHub Actions trusted publisher: owner `simon86pl`, repository `expectbox-sdk`, workflow filename `release.yml`, environment `npm`. Allow direct publishing.
4. Set GitHub repository variable `NPM_PUBLISH_ENABLED=true`. Subsequent tags publish using OIDC; there is no long-lived npm token in CI.

### PyPI

1. In your PyPI account, add a **pending trusted publisher** for project `expectbox-agents`: owner `simon86pl`, repository `expectbox-sdk`, workflow `release.yml`, environment `pypi`.
2. Set GitHub repository variable `PYPI_PUBLISH_ENABLED=true`. A new tag publishes using OIDC. The first successful upload creates the project.

Enable registry publishing before tagging the next version. Registry jobs fail on an already published version; never overwrite an existing release or reuse a version for different code.

Before tagging, protect `main`, limit who can create version tags, and consider required reviewers on `npm`/`pypi` GitHub environments.

Official setup references: [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/), [PyPI pending publishers](https://docs.pypi.org/trusted-publishers/creating-a-project-through-oidc/).
