export const languageConfigs = {
  python: {
    image: 'python:3.11-slim',
    fileExtension: 'py',
    compileCommand: '',
    runCommand: 'python3 solution.py',
    judge0Id: 71,
    template: `def lengthOfLastWord(s):
    s = s.strip()
    length = 0
    for i in range(len(s) - 1, -1, -1):
        if s[i] == ' ':
            break
        length += 1
    return length

if __name__ == "__main__":
    s = input()
    print(lengthOfLastWord(s))`,
  },
  javascript: {
    image: 'node:20-slim',
    fileExtension: 'js',
    compileCommand: '',
    runCommand: 'node solution.js',
    judge0Id: 63,
    template: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim();
console.log(input);`,
  },
  java: {
    image: 'openjdk:17-slim',
    fileExtension: 'java',
    compileCommand: 'javac Solution.java',
    runCommand: 'java Solution',
    judge0Id: 62,
    template: `import java.util.Scanner;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            System.out.println(sc.nextLine());
        }
    }
}`,
  },
  cpp: {
    image: 'gcc:latest',
    fileExtension: 'cpp',
    compileCommand: 'g++ -o solution solution.cpp',
    runCommand: './solution',
    judge0Id: 54,
    template: `#include <iostream>
#include <string>
using namespace std;
int main() {
    string s;
    getline(cin, s);
    cout << s << endl;
    return 0;
}`,
  },
  c: {
    image: 'gcc:latest',
    fileExtension: 'c',
    compileCommand: 'gcc -o solution solution.c',
    runCommand: './solution',
    judge0Id: 50,
    template: `#include <stdio.h>
int main() {
    char s[100];
    if (fgets(s, sizeof(s), stdin)) {
        printf("%s", s);
    }
    return 0;
}`,
  },
};

export type Language = keyof typeof languageConfigs;

export const getLanguageConfig = (language: string) => {
  const config = (languageConfigs as any)[language.toLowerCase()];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }
  return config;
};
