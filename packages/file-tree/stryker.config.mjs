/**
 * Mutation testing for the data logic. Stryker makes small changes to the code (flips a condition,
 * removes a statement, swaps an operator) and checks that some test fails for each one. The share
 * of changes caught is the mutation score: a stronger signal than coverage, which only says that
 * a line ran.
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  testRunner: 'vitest',
  vitest: { configFile: 'vitest.config.ts' },
  mutate: ['src/model/**/*.ts', 'src/state/**/*.ts', '!src/**/*.test.ts', '!src/model/types.ts'],
  coverageAnalysis: 'perTest',
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  thresholds: { high: 95, low: 90, break: 90 },
  tempDirName: '.stryker-tmp',
  // Mutate the files where they are (Stryker restores them afterwards): a sandbox copy of this
  // package can't resolve the shared Vitest settings in ../config.
  inPlace: true,
}
