const path = require('path');
const fs = require('fs');

class IeleCompiler {
  constructor(compilerApi) {
    this.compilerApi = compilerApi;
  }

  _makeCompilerRequest(sources, method) {
    const request = new XMLHttpRequest();
    request.open('POST', this.compilerApi, false);
    request.setRequestHeader("Content-Type", "application/json");
    request.responseType = 'json';

    let sourceObj = {};
    for (let s of sources) {
      sourceObj[s.filename] = s.code;
    }

    const payload = {
      "jsonrpc": "2.0", 
      "method": method,
      "id": 0,
      "params": [
        sources[0].filename, 
        sourceObj
      ]
    }

    request.send(JSON.stringify(payload));

    if (request.status == 200) {
      let responseJson = null;
      try {
        responseJson = JSON.parse(request.responseText);
      } catch (err) {
        throw 'Compiler error: ' + err;
      }

      if (responseJson.error) {
        throw 'Compiler error: ' + JSON.stringify(responseJson.error);
      } else {
        return responseJson.result;
      }
    } else {
      throw 'Compiler error: ' + request.status + '\n' + request.responseText;
    }
  }

  _findSolImportStatements(code) {
    const stmts = code.replace(/\n/g, ' ').replace(/'/g, '"').split(';');
    return stmts.reduce((acc, stmt) => {
      const re = /import.*"(.*)"/g;
      const m = re.exec(stmt);
      return m ? acc.concat(m[1]) : acc;
    }, []);
  }

  _findSourceFiles(baseDir, importerPath, currentPath, found = []) {
    const foundPaths = new Set(found.map(s => s.filename))
    if (foundPaths.has(currentPath))
      return [];
    else {
      const pathToRead = path.join(baseDir, importerPath, currentPath);
      const relativePath = path.relative(baseDir, pathToRead);
      const source = {
        filename: relativePath, 
        code: fs.readFileSync(pathToRead).toString('utf-8')
      }
      const imports = this._findSolImportStatements(source.code);

      return imports.reduce((acc, p) => {
        const nextFound = this._findSourceFiles(baseDir, path.dirname(currentPath), p, acc);
        return acc.concat(nextFound);
      }, found.concat(source));
    }
  }

  _parseSol2IeleOutput(output) {
    const sources = output.split(/(?======== .* =======)/).slice(1);
    return sources.reduce((acc, s) => {
      const lines = s.split('\n');
      const filename = /======= (.*) =======/.exec(lines[0])[1].replace(/:.*$/g, '').replace(/\.sol$/g, '.iele');
      const code = lines.slice(2).join('\n');
      return acc.concat({filename, code});
    }, [])
  }

  _compileSol(sources) {
    const output = this._makeCompilerRequest(sources, 'sol2iele_asm')
    const ieleSources = this._parseSol2IeleOutput(output);
    const error = ieleSources.length == 0;
    const result = {sources: sources, solidityCompilerOutput: output, error}

    if (!error) {
      result.ieleSources = ieleSources;
      result.bytecode = this._compileIele(ieleSources).result;
    }

    return result;
  }

  _compileIele(sources) {
    const result = this._makeCompilerRequest(sources, 'iele_asm');
    return {sources: sources, result: result};
  }

  compile(sourcePath) {
    const mainFile = path.basename(sourcePath);
    const baseDir = path.dirname(sourcePath);

    if (mainFile.endsWith('.iele')) {
      //TODO: support multiple sources
      const sources = [{filename: mainFile, code: fs.readFileSync(sourcePath).toString('utf-8')}];
      return this._compileIele(sources);
    } else if (mainFile.endsWith('.sol')) {
      const sources = Array.from(this._findSourceFiles(baseDir, '.', mainFile));
      return this._compileSol(sources);
    } else {
      throw 'filename suffix must be .sol or .iele';
    }
  }
}

module.exports = IeleCompiler;