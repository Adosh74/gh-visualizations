/**
 * Manual mock for @octokit/rest, applied automatically by jest to every suite.
 *
 * The real package is ESM-only while ts-jest compiles to CommonJS, so any suite
 * that reaches github-service — importing the Express app is enough — would
 * otherwise fail with "Cannot use import statement outside a module".
 *
 * This stub only has to exist and stay inert: suites that care about GitHub
 * behaviour mock `github-service` itself, and github-service.test.ts installs
 * its own `jest.mock('@octokit/rest', ...)` factory that it can drive.
 */
export class Octokit {
  paginate = jest.fn();
  repos = {
    get: jest.fn(),
    getBranch: jest.fn(),
    listCommits: jest.fn(),
    listForUser: jest.fn(),
  };

  pulls = {
    list: jest.fn(),
  };
}
