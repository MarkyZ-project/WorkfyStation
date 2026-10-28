// snippets.js — frammenti di codice inseribili dalla palette comandi.

export const LANGUAGES = [
  {
    id: "c", label: "C", ext: "c", compiler: "gcc-head-c",
    template: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
  },
  {
    id: "cpp", label: "C++", ext: "cpp", compiler: "gcc-head",
    template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n',
  },
  {
    id: "java", label: "Java", ext: "java", compiler: "openjdk-jdk-22+36",
    template: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
  },
  {
    id: "python", label: "Python", ext: "py", compiler: "cpython-3.12.7",
    template: 'def main():\n    print("Hello, World!")\n\n\nif __name__ == "__main__":\n    main()\n',
  },
];

export const SNIPPETS = {
  c: [
    { name: "main", text: "int main() {\n    \n    return 0;\n}\n" },
    { name: "for", text: "for (int i = 0; i < n; i++) {\n    \n}\n" },
    { name: "while", text: "while (cond) {\n    \n}\n" },
    { name: "if / else", text: "if (cond) {\n    \n} else {\n    \n}\n" },
    { name: "printf", text: 'printf("%d\\n", x);\n' },
    { name: "scanf", text: 'scanf("%d", &x);\n' },
    { name: "struct", text: "typedef struct {\n    int campo;\n} Nome;\n" },
    { name: "funzione", text: "int nome(int a, int b) {\n    return a + b;\n}\n" },
    { name: "array", text: "int v[10];\nfor (int i = 0; i < 10; i++) {\n    v[i] = i;\n}\n" },
    { name: "malloc", text: "int *p = malloc(n * sizeof(int));\nif (p == NULL) {\n    return 1;\n}\nfree(p);\n" },
    { name: "#include", text: "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n" },
  ],
  cpp: [
    { name: "main", text: "int main() {\n    \n    return 0;\n}\n" },
    { name: "for", text: "for (int i = 0; i < n; i++) {\n    \n}\n" },
    { name: "range-for", text: "for (const auto& x : v) {\n    \n}\n" },
    { name: "cout", text: 'cout << x << endl;\n' },
    { name: "cin", text: "cin >> x;\n" },
    { name: "class", text: "class Nome {\npublic:\n    Nome() {}\n\nprivate:\n    int campo;\n};\n" },
    { name: "vector", text: "vector<int> v;\nv.push_back(1);\n" },
    { name: "#include", text: "#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\nusing namespace std;\n" },
  ],
  java: [
    { name: "main", text: "public static void main(String[] args) {\n    \n}\n" },
    { name: "for", text: "for (int i = 0; i < n; i++) {\n    \n}\n" },
    { name: "Scanner", text: "Scanner in = new Scanner(System.in);\nint x = in.nextInt();\n" },
    { name: "println", text: "System.out.println(x);\n" },
    { name: "class", text: "public class Nome {\n    private int campo;\n\n    public Nome() {}\n}\n" },
    { name: "import", text: "import java.util.*;\n" },
  ],
  python: [
    { name: "main", text: 'def main():\n    pass\n\n\nif __name__ == "__main__":\n    main()\n' },
    { name: "for", text: "for i in range(n):\n    pass\n" },
    { name: "while", text: "while cond:\n    pass\n" },
    { name: "input", text: 'x = int(input("Numero: "))\n' },
    { name: "class", text: "class Nome:\n    def __init__(self):\n        pass\n" },
    { name: "with open", text: 'with open("file.txt") as f:\n    data = f.read()\n' },
  ],
};
