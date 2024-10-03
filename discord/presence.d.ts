interface IActivityTemplate {
    name: string,
    type: number,
    url?: string, //only if type is 1
    created_at: number,
    timestamps?: { //required for petain playing
        start?: number, 
        end?: number
    },
    details?: string, 
    state?: string,
    emoji?: {
        name: string,
        id?: number,
        animated?: boolean
    },
    party?: { // must impl
        id?: string,
        size?: [number, number]
    },
    assets?: {
        large_image?: string,
        large_text?: string,
        small_image?: string,
        small_text?: string
    },
    secrets?: { // must impl
        match?: string,
        join?: string,
        spectate?: string
    },
    instance?: boolean,
    flags?: number, // must impl
    buttons?: { //useless
        label: string,
        url: string
    }[]
}

interface IActivityArgs {
    pid: number,
    activity?: IActivityTemplate
}