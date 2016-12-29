/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as path from 'path';

import { languages, workspace, ExtensionContext, IndentAction } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, Range, RequestType } from 'vscode-languageclient';
import { EMPTY_ELEMENTS } from './htmlEmptyTagsShared';
import { activateColorDecorations } from './colorDecorators';

namespace ColorSymbolRequest {
  export const type: RequestType<string, Range[], any, any> = { get method() { return 'css/colorSymbols'; }, _: null };
}

export function activate(context: ExtensionContext) {

  // The server is implemented in node
  let serverModule = context.asAbsolutePath(path.join('server', 'out', 'htmlServerMain.js'));
  // The debug options for the server
  let debugOptions = { execArgv: ['--nolazy', '--debug=6004'] };

  // If the extension is launch in debug mode the debug server options are use
  // Otherwise the run options are used
  let serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
  };

  let documentSelector = ['html', 'handlebars', 'razor'];
  let embeddedLanguages = { css: true, javascript: true };

  // Options to control the language client
  let clientOptions: LanguageClientOptions = {
    documentSelector,
    synchronize: {
      configurationSection: ['html', 'css', 'javascript'], // the settings to synchronize
    },
    initializationOptions: {
      embeddedLanguages,
      ['format.enable']: workspace.getConfiguration('html').get('format.enable')
    }
  };

  // Create the language client and start the client.
  let client = new LanguageClient('html', 'HTML Language Server', serverOptions, clientOptions, true);
  let disposable = client.start();
  context.subscriptions.push(disposable);
  client.onReady().then(() => {
    let colorRequestor = (uri: string) => {
      return client.sendRequest(ColorSymbolRequest.type, uri).then(ranges => ranges.map(client.protocol2CodeConverter.asRange));
    };
    let disposable = activateColorDecorations(colorRequestor, { html: true, handlebars: true, razor: true });
    context.subscriptions.push(disposable);
  });
}