import pino from 'pino'
import { contextState } from '../async-context';
 
export const logger = pino({
    timestamp:false,
	messageKey: 'message',
    base:undefined,
	formatters: {
		level: (label: string) => {
			return { level: label.toUpperCase() }
		},
	},
    mixin(){
        return { 
            ...contextState.getStore()
        };
    },
    mixinMergeStrategy(mergeObject:any, mixinObject:any) {
        return Object.assign(mergeObject, mixinObject)
    }
})

