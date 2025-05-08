/*!
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { BundleBuilder } from 'wbn';
import { Plugin, OutputOptions } from 'rollup';
import {
  addAsset,
  addFilesRecursively,
  getSignedWebBundle,
} from '../../shared/utils';
import {
  getValidatedOptionsWithDefaults,
  PluginOptions,
} from '../../shared/types';

// Plugin name for rollup and logs
const PLUGIN_NAME = 'wbn-bundle-plugin';

const consoleLogColor = { green: '\x1b[32m', reset: '\x1b[0m' };
function infoLogger(text: string): void {
  console.log(`${consoleLogColor.green}${text}${consoleLogColor.reset}\n`);
}

// Print debug logs when the debug option is true.
function debugLog(text: string, debug = false): void {
  if (debug) {
    console.log(`[${PLUGIN_NAME}] ${text}`);
  }
}

// TODO(sonkkeli): Probably this depends on the Rollup version. Figure out how
// this should be refactored.
// https://rollupjs.org/plugin-development/#build-hooks
type EnforcedPlugin = Plugin & { enforce: 'post' | 'pre' | null };

export default function wbnOutputPlugin(
  rawOpts: PluginOptions
): EnforcedPlugin {
  // Extract debug option or default to false
  const debug = rawOpts.debug === true;

  return {
    name: PLUGIN_NAME,
    enforce: 'post',

    async generateBundle(outputOptions: OutputOptions, bundle): Promise<void> {
      try {
        // Create a unique ID for this output
        const outputId = outputOptions.dir || outputOptions.file;

        if (!outputId) {
          debugLog(`Skipping unknown output`, debug);
          debugLog(`Bundle: ${Object.keys(bundle)}`, debug);
          return;
        }

        debugLog(`Processing output: ${outputId}`, debug);

        // Skip processing if bundle is empty (might happen on subsequent calls)
        if (Object.keys(bundle).length === 0) {
          debugLog('Skipping empty bundle', debug);
          return;
        }

        debugLog(`Processing bundle with ${Object.keys(bundle).length} entries`, debug);
        const opts = await getValidatedOptionsWithDefaults(rawOpts);

        const builder = new BundleBuilder(opts.formatVersion);
        if ('primaryURL' in opts && opts.primaryURL) {
          builder.setPrimaryURL(opts.primaryURL);
        }

        if (opts.static) {
          addFilesRecursively(
            builder,
            opts.static.baseURL ?? opts.baseURL,
            opts.static.dir,
            opts
          );
        }

        for (const name of Object.keys(bundle)) {
          const asset = bundle[name];
          const content = asset.type === 'asset' ? asset.source : asset.code;

          // Skip assets with undefined content (can happen with worker files in ES format)
          if (content === undefined) {
            debugLog(`Skipping intermediate asset (${asset.fileName}) with undefined content`, debug);
            continue;
          }

          debugLog(`Processing asset: ${asset.fileName}`, debug);
          try {
            addAsset(
              builder,
              opts.baseURL,
              asset.fileName,
              content,
              opts
            );
          } catch (error) {
            console.error(`Error adding asset ${asset.fileName} to web bundle:`, error);
            // Continue with other assets rather than failing
          }
          delete bundle[name];
        }

        let webBundle = builder.createBundle();
        if ('integrityBlockSign' in opts) {
          webBundle = await getSignedWebBundle(webBundle, opts, infoLogger);
        }

        if (!webBundle) {
          throw new Error('Failed to create web bundle: bundle is undefined');
        }

        this.emitFile({
          fileName: opts.output,
          type: 'asset',
          source: Buffer.isBuffer(webBundle) ? webBundle : Buffer.from(webBundle)
        });

        debugLog(`Web bundle emitted: ${opts.output}`, debug);
      } catch (error) {
        console.error('Error in wbn-output-plugin:', error);
        throw new Error(`Error generating and signing the Web Bundle! ${error}`);
      }
    },
  };
}
