import {
    CodeGeneratorRequest,
    CodeGeneratorResponse_Feature,
    DescriptorProto,
    DescriptorRegistry,
    PluginBase,
    SymbolTable,
    TypeScriptImports
} from "@protobuf-ts/plugin-framework";
import {OutFile} from "./out-file";
import {CommentGenerator} from "./code-gen/comment-generator";
import {MessageInterfaceGenerator} from "./code-gen/message-interface-generator";
import {FileTable} from "./file-table";
import {EnumGenerator} from "./code-gen/enum-generator";


export class ProtobuftsPlugin extends PluginBase<OutFile> {

    parameters = {
        // @formatter:off
        emit_default_values: {
            description: "TODO",
        },
        enum_as_integer: {
            description: "TODO",
        },
        use_proto_field_name: {
            description: "TODO",
        },
        generate_dependencies: {
            description: "By default, only the PROTO_FILES passed as input to protoc are generated, \n" +
                "not the files they import. Set this option to generate code for dependencies \n" +
                "too.",
        },
        // @formatter:on
    }


    constructor(private readonly version: string) {
        super();
        this.version = version;
    }


    generate(request: CodeGeneratorRequest): OutFile[] {
        const
            params = this.parseOptions(this.parameters, request.parameter),
            pluginCredit = `by protobuf-ts ${this.version}` + (request.parameter ? ` with parameter ${request.parameter}` : ''),
            registry = DescriptorRegistry.createFrom(request),
            symbols = new SymbolTable(),
            fileTable = new FileTable(),
            imports = new TypeScriptImports(symbols),
            comments = new CommentGenerator(registry),
            genMessageInterface = new MessageInterfaceGenerator(symbols, registry, imports, comments, interpreter, options),
            genEnum = new EnumGenerator(symbols, registry, imports, comments, interpreter, options)
        ;


        let outFiles: OutFile[] = [];


        // ensure unique file names
        for (let fileDescriptor of registry.allFiles()) {
            const base = fileDescriptor.name!.replace('.proto', '');
            fileTable.register(base + '.ts', fileDescriptor);
        }
        for (let fileDescriptor of registry.allFiles()) {
            const base = fileDescriptor.name!.replace('.proto', '');
            fileTable.register(base + '.server.ts', fileDescriptor, 'generic-server');
            fileTable.register(base + '.grpc-server.ts', fileDescriptor, 'grpc1-server');
            fileTable.register(base + '.client.ts', fileDescriptor, 'client');
            fileTable.register(base + '.promise-client.ts', fileDescriptor, 'promise-client');
            fileTable.register(base + '.rx-client.ts', fileDescriptor, 'rx-client');
            fileTable.register(base + '.grpc-client.ts', fileDescriptor, 'grpc1-client');
        }


        for (let fileDescriptor of registry.allFiles()) {
            const outMain = new OutFile(fileTable.get(fileDescriptor).name, fileDescriptor, registry, pluginCredit);
            outFiles.push(outMain);

            registry.visitTypes(fileDescriptor, descriptor => {
                // we are not interested in synthetic types like map entry messages
                if (registry.isSyntheticElement(descriptor)) return;

                if (DescriptorProto.is(descriptor)) {
                    genMessageInterface.generateMessageInterface(outMain, descriptor)
                }
                if (EnumDescriptorProto.is(descriptor)) {
                    genEnum.generateEnum(outMain, descriptor);
                }
            });

        }


        // plugins should only return files requested to generate
        // unless our option "generate_dependencies" is set
        if (!params.generate_dependencies) {
            outFiles = outFiles.filter(file => request.fileToGenerate.includes(file.fileDescriptor.name!));
        }

        // if a proto file is imported to use custom options, or if a proto file declares custom options,
        // we do not to emit it. unless it was explicitly requested.
        const outFileDescriptors = outFiles.map(of => of.fileDescriptor);
        outFiles = outFiles.filter(of =>
            request.fileToGenerate.includes(of.fileDescriptor.name!)
            || registry.isFileUsed(of.fileDescriptor, outFileDescriptors)
        );

        return outFiles;
    }


    // we support proto3-optionals, so we let protoc know
    protected getSupportedFeatures = () => [CodeGeneratorResponse_Feature.PROTO3_OPTIONAL];


}
