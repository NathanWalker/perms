import { Device, Trace, Utils } from '@nativescript/core';
import { CheckOptions, Permissions as PermissionsType, RequestOptions } from './permissions';
import { CLog, CLogTypes } from './permissions.common';
export * from './permissions.common';

export namespace PermissionsIOS {
    export enum Status {
        Undetermined = 'undetermined',
        Denied = 'denied',
        Authorized = 'authorized',
        Limited = 'limited',
        Restricted = 'restricted'
    }
    namespace NSPLocation {
        let status: Status = Status.Undetermined;
        function getStatusFromCLAuthorizationStatus(lStatus: CLAuthorizationStatus, type?: string): [Status, boolean] {
            let always = false;
            switch (lStatus) {
                case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways:
                    always = true;
                    status = Status.Authorized;
                    break;
                case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse:
                    status = Status.Authorized;
                    break;
                case CLAuthorizationStatus.kCLAuthorizationStatusDenied:
                    status = Status.Denied;
                    break;
                case CLAuthorizationStatus.kCLAuthorizationStatusRestricted:
                    status = Status.Restricted;
                    break;
                default:
                    status = Status.Undetermined;
            }
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'NSPLocation getStatusFromCLAuthorizationStatus', lStatus, type, status, always);
            }
            return [status, always];
        }
        export function getStatusForType(type?: string): [Status, boolean] {
            const status2 = CLLocationManager.authorizationStatus();
            return getStatusFromCLAuthorizationStatus(status2, type);
        }
        let locationManager: CLLocationManager;
        let locationManagerDelegate: CLLocationManagerDelegateImpl;
        export type SubCLLocationManagerDelegate = Partial<CLLocationManagerDelegate>;
        @NativeClass
        export class CLLocationManagerDelegateImpl extends NSObject implements CLLocationManagerDelegate {
            public static ObjCProtocols = [CLLocationManagerDelegate];

            private subDelegates: SubCLLocationManagerDelegate[];

            public addSubDelegate(delegate: SubCLLocationManagerDelegate) {
                if (!this.subDelegates) {
                    this.subDelegates = [];
                }
                const index = this.subDelegates.indexOf(delegate);
                if (index === -1) {
                    this.subDelegates.push(delegate);
                }
            }

            public removeSubDelegate(delegate: SubCLLocationManagerDelegate) {
                const index = this.subDelegates.indexOf(delegate);
                if (index !== -1) {
                    this.subDelegates.splice(index, 1);
                }
            }
            static new(): CLLocationManagerDelegateImpl {
                return super.new() as CLLocationManagerDelegateImpl;
            }
            public initDelegate() {
                this.subDelegates = [];
                return this;
            }
            locationManagerDidChangeAuthorizationStatus(manager: CLLocationManager, status: CLAuthorizationStatus) {
                this.subDelegates &&
                    this.subDelegates.forEach(d => {
                        if (d.locationManagerDidChangeAuthorizationStatus) {
                            d.locationManagerDidChangeAuthorizationStatus(manager, status);
                        }
                    });
            }
            // locationManagerDidFailWithError(manager: CLLocationManager, error: NSError) {
            //     this.subDelegates &&
            //         this.subDelegates.forEach(d => {
            //             if (d.locationManagerDidFailWithError) {
            //                 d.locationManagerDidFailWithError(manager, error);
            //             }
            //         });
            // }
        }
        export function request(type): Promise<[Status, boolean]> {
            const status = getStatusForType(type);
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'NSPLocation request', type, status);
            }
           if (status[0] === Status.Undetermined || status[0] === Status.Denied) {
                return new Promise((resolve, reject) => {
                    if (!locationManager) {
                        locationManager = CLLocationManager.new();
                    }
                    if (!locationManagerDelegate) {
                        locationManagerDelegate = CLLocationManagerDelegateImpl.new().initDelegate();
                        locationManager.delegate = locationManagerDelegate;
                    }
                    const subD = {
                        locationManagerDidChangeAuthorizationStatus: (manager, status: CLAuthorizationStatus) => {
                            if (Trace.isEnabled()) {
                                CLog(CLogTypes.info, 'locationManagerDidChangeAuthorizationStatus', status);
                            }
                            if (status !== CLAuthorizationStatus.kCLAuthorizationStatusNotDetermined) {
                                if (locationManagerDelegate) {
                                    locationManagerDelegate.removeSubDelegate(subD);
                                    locationManagerDelegate = null;
                                }
                                if (locationManager) {
                                    locationManager.delegate = null;
                                    locationManager = null;
                                }
                                const rStatus = getStatusFromCLAuthorizationStatus(status, type);
                                resolve(rStatus);
                                // } else {
                                // reject('kCLAuthorizationStatusNotDetermined');
                            }
                        }
                    };
                    locationManagerDelegate.addSubDelegate(subD);
                    try {
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, 'NSPLocation requestAuthorization', type);
                        }
                        if (type === 'always') {
                            locationManager.requestAlwaysAuthorization();
                        } else {
                            locationManager.requestWhenInUseAuthorization();
                        }
                    } catch (e) {
                        reject(e);
                        if (locationManagerDelegate) {
                            locationManagerDelegate.removeSubDelegate(subD);
                            locationManagerDelegate = null;
                        }
                        if (locationManager) {
                            locationManager.delegate = null;
                            locationManager = null;
                        }
                    }
                });
            } else {
                // if (CLLocationManager.authorizationStatus() === CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse && type === 'always') {
                //     return Promise.resolve(Status.Denied);
                // } else {
                return Promise.resolve(status);
                // }
            }
        }
    }
    namespace NSPBluetooth {
        let status: Status = Status.Undetermined;
        export function getStatus(): [Status, boolean] {
            const status2 = CBPeripheralManager.authorizationStatus();
            switch (status2) {
                case CBPeripheralManagerAuthorizationStatus.Authorized:
                    status = Status.Authorized;
                    break;
                case CBPeripheralManagerAuthorizationStatus.Denied:
                    status = Status.Denied;
                    break;
                case CBPeripheralManagerAuthorizationStatus.Restricted:
                    status = Status.Restricted;
                    break;
                default:
                    status = Status.Undetermined;
            }
            return [status, true];
        }
        export type SubCBPeripheralManagerDelegate = Partial<CBPeripheralManagerDelegate>;
        @NativeClass
        export class CBPeripheralManagerDelegateImpl extends NSObject implements CBPeripheralManagerDelegate {
            public static ObjCProtocols = [CBPeripheralManagerDelegate];

            private subDelegates: SubCBPeripheralManagerDelegate[];

            public addSubDelegate(delegate: SubCBPeripheralManagerDelegate) {
                const index = this.subDelegates.indexOf(delegate);
                if (index === -1) {
                    this.subDelegates.push(delegate);
                }
            }

            public removeSubDelegate(delegate: SubCBPeripheralManagerDelegate) {
                const index = this.subDelegates.indexOf(delegate);
                if (index !== -1) {
                    this.subDelegates.splice(index, 1);
                }
            }
            static new(): CBPeripheralManagerDelegateImpl {
                return super.new() as CBPeripheralManagerDelegateImpl;
            }
            public initDelegate(): CBPeripheralManagerDelegateImpl {
                this.subDelegates = [];
                return this;
            }
            peripheralManagerDidUpdateState(peripheralManager) {
                this.subDelegates.forEach(d => {
                    if (d.peripheralManagerDidUpdateState) {
                        d.peripheralManagerDidUpdateState(peripheralManager);
                    }
                });
            }
        }
        let peripheralManager: CBPeripheralManager;
        export function request(): Promise<[Status, boolean]> {
            const status = getStatus();
           if (status[0] === Status.Undetermined || status[0] === Status.Denied) {
                return new Promise((resolve, reject) => {
                    if (!peripheralManager) {
                        peripheralManager = CBPeripheralManager.new();
                        peripheralManager.delegate = CBPeripheralManagerDelegateImpl.new().initDelegate();
                    }
                    const subD = {
                        peripheralManagerDidUpdateState: peripheralManager => {
                            if (peripheralManager) {
                                peripheralManager.stopAdvertising();
                                (peripheralManager.delegate as CBPeripheralManagerDelegateImpl).removeSubDelegate(subD);
                                peripheralManager.delegate = null;
                                peripheralManager = null;
                            }
                            // for some reason, checking permission right away returns denied. need to wait a tiny bit
                            setTimeout(() => {
                                resolve(getStatus());
                            }, 100);
                        }
                    };
                    (peripheralManager.delegate as CBPeripheralManagerDelegateImpl).addSubDelegate(subD);
                    try {
                        peripheralManager.startAdvertising(null);
                    } catch (e) {
                        reject(e);
                    }
                });
            } else {
                return Promise.resolve(status);
            }
        }
    }
    namespace NSPAudioVideo {
        let status: Status = Status.Undetermined;
        function typeFromString(value: string) {
            if (value === 'audio') {
                return AVMediaTypeAudio;
            } else {
                return AVMediaTypeVideo;
            }
        }
        export function getStatus(type?: string): [Status, boolean] {
            const videoStatus = AVCaptureDevice.authorizationStatusForMediaType(typeFromString(type));
            switch (videoStatus) {
                case AVAuthorizationStatus.Authorized:
                    status = Status.Authorized;
                    break;
                case AVAuthorizationStatus.Denied:
                    status = Status.Denied;
                    break;
                case AVAuthorizationStatus.Restricted:
                    status = Status.Restricted;
                    break;
                default:
                    status = Status.Undetermined;
            }
            return [status, true];
        }

        export function request(type): Promise<[Status, boolean]> {
            return new Promise((resolve, reject) => {
                AVCaptureDevice.requestAccessForMediaTypeCompletionHandler(typeFromString(type), granted => resolve(getStatus(type)));
            });
        }
    }
    namespace NSPSpeechRecognition {
        let status: Status = Status.Undetermined;
        export function getStatus(): [Status, boolean] {
            const speechStatus = SFSpeechRecognizer.authorizationStatus();
            switch (speechStatus) {
                case SFSpeechRecognizerAuthorizationStatus.Authorized:
                    status = Status.Authorized;
                    break;
                case SFSpeechRecognizerAuthorizationStatus.Denied:
                    status = Status.Denied;
                    break;
                case SFSpeechRecognizerAuthorizationStatus.Restricted:
                    status = Status.Restricted;
                    break;
                default:
                    status = Status.Undetermined;
            }
            return [status, true];
        }

        export function request(): Promise<[Status, boolean]> {
            return new Promise(resolve => {
                SFSpeechRecognizer.requestAuthorization(() => resolve(getStatus()));
            });
        }
    }
    namespace NSPPhoto {
        let status: Status = Status.Undetermined;
        export function getStatus(): [Status, boolean] {
            let photoStatus: PHAuthorizationStatus;
            if (parseFloat(Device.osVersion) >= 14) {
                photoStatus = PHPhotoLibrary.authorizationStatusForAccessLevel(PHAccessLevel.ReadWrite);
            } else {
                photoStatus = PHPhotoLibrary.authorizationStatus();
            }
            switch (photoStatus) {
                case PHAuthorizationStatus.Authorized:
                    status = Status.Authorized;
                    break;
                case PHAuthorizationStatus.Denied:
                    status = Status.Denied;
                    break;
                case PHAuthorizationStatus.Restricted:
                    status = Status.Restricted;
                    break;
                default:
                    status = Status.Undetermined;
            }
            return [status, true];
        }

        export function request(): Promise<[Status, boolean]> {
            return new Promise(resolve => {
                PHPhotoLibrary.requestAuthorization(() => resolve(getStatus()));
            });
        }
    }
    namespace NSPMotion {
        let status: Status = Status.Undetermined;
        export function getStatus(): [Status, boolean] {
            if (status === Status.Undetermined) {
                const cmStatus = (CMMotionActivityManager.authorizationStatus as any) as CMAuthorizationStatus;
                switch (cmStatus) {
                    case CMAuthorizationStatus.Authorized:
                        status = Status.Authorized;
                        break;
                    case CMAuthorizationStatus.Denied:
                        status = Status.Denied;
                        break;
                    case CMAuthorizationStatus.Restricted:
                        status = Status.Restricted;
                        break;
                }
            }
            return [status, true];
        }

        export function request(): Promise<[Status, boolean]> {
            if (status === Status.Undetermined) {
                return new Promise(resolve => {
                    let activityManager = CMMotionActivityManager.new();
                    let motionActivityQueue = NSOperationQueue.new();
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'NSPMotion request', status);
                    }
                    activityManager.queryActivityStartingFromDateToDateToQueueWithHandler(NSDate.distantPast, new Date(), motionActivityQueue, (activities, error) => {
                        if (error) {
                            status = Status.Denied;
                        } else if (activities || !error) {
                            status = Status.Authorized;
                        }
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, 'NSPMotion got response', activities, error, status, getStatus());
                        }
                        resolve([status, true]);
                        activityManager = null;
                        motionActivityQueue = null;
                    });
                });
            } else {
                return Promise.resolve([status, true]);
            }
        }
    }
    namespace NSPMediaLibrary {
        let status: Status = Status.Undetermined;
        export function getStatus(): [Status, boolean] {
            const mediaStatus = MPMediaLibrary.authorizationStatus();
            switch (mediaStatus) {
                case MPMediaLibraryAuthorizationStatus.Authorized:
                    status = Status.Authorized;
                    break;
                case MPMediaLibraryAuthorizationStatus.Denied:
                    status = Status.Denied;
                    break;
                case MPMediaLibraryAuthorizationStatus.Restricted:
                    status = Status.Restricted;
                    break;
                default:
                    status = Status.Undetermined;
            }
            return [status, true];
        }

        export function request(): Promise<[Status, boolean]> {
            return new Promise(resolve => {
                MPMediaLibrary.requestAuthorization(() => resolve(getStatus()));
            });
        }
    }
    namespace NSPNotification {
        let status: Status = Status.Undetermined;
        const NSPDidAskForNotification = 'NSPDidAskForNotification';
        export async function getStatus(): Promise<[Status, boolean]> {
            const didAskForPermission = NSUserDefaults.standardUserDefaults.boolForKey(NSPDidAskForNotification);
            let isEnabled = false;
            const osVersion = parseFloat(Device.osVersion);
            if (osVersion >= 10) {
                const test =await (new Promise<UNNotificationSettings>(resolve=>UNUserNotificationCenter.currentNotificationCenter().getNotificationSettingsWithCompletionHandler(resolve) ));
                isEnabled =(test.authorizationStatus === UNAuthorizationStatus.Authorized);
            } else {
                isEnabled = UIApplication.sharedApplication.currentUserNotificationSettings.types !== UIUserNotificationType.None;
            }

            if (isEnabled) {
                status = Status.Authorized;
            } else {
                status = didAskForPermission ? Status.Denied : Status.Undetermined;
            }
            return [status, true];
        }

        export async function request(types: UIUserNotificationType | UNAuthorizationOptions = UNAuthorizationOptions.Alert): Promise<[Status, boolean]> {
            const status = await getStatus();

            if (status[0] === Status.Undetermined || status[0] === Status.Denied) {
                return new Promise((resolve, reject) => {
                    const osVersion = parseFloat(Device.osVersion);
                    if (osVersion >= 10) {
                        UNUserNotificationCenter.currentNotificationCenter().requestAuthorizationWithOptionsCompletionHandler(types as UNAuthorizationOptions, (p1: boolean, error: NSError)=>{
                            if (error) {
                                reject(error);
                            } else {
                                Utils.dispatchToMainThread(async () => {
                                    UIApplication.sharedApplication.registerForRemoteNotifications();
                                    NSUserDefaults.standardUserDefaults.setBoolForKey(true, NSPDidAskForNotification);
                                    NSUserDefaults.standardUserDefaults.synchronize();
                                    resolve(await getStatus());
                                })
                            }
                        });
                    } else {
                        Utils.dispatchToMainThread(async () => {
                            const settings = UIUserNotificationSettings.settingsForTypesCategories(types as UIUserNotificationType, null);
                            UIApplication.sharedApplication.registerUserNotificationSettings(settings);
                            UIApplication.sharedApplication.registerForRemoteNotifications();

                            NSUserDefaults.standardUserDefaults.setBoolForKey(true, NSPDidAskForNotification);
                            NSUserDefaults.standardUserDefaults.synchronize();
                            resolve(await getStatus());
                        });
                    }
                });
            } else {
                return Promise.resolve(status);
            }
        }
    }
    namespace NSPContacts {
        let status: Status = Status.Undetermined;
        export function getStatus(): [Status, boolean] {
            const contactStatus = CNContactStore.authorizationStatusForEntityType(CNEntityType.Contacts);
            switch (contactStatus) {
                case CNAuthorizationStatus.Authorized:
                    status = Status.Authorized;
                    break;
                case CNAuthorizationStatus.Denied:
                    status = Status.Denied;
                    break;
                case CNAuthorizationStatus.Restricted:
                    status = Status.Restricted;
                    break;
                default:
                    status = Status.Undetermined;
            }
            return [status, true];
        }

        export function request(): Promise<[Status, boolean]> {
            return new Promise(resolve => {
                const contactStore = CNContactStore.new();
                contactStore.requestAccessForEntityTypeCompletionHandler(CNEntityType.Contacts, () => resolve(getStatus()));
            });
        }
    }
    namespace NSPBackgroundRefresh {
        let status: Status = Status.Undetermined;
        export function getStatus(): [Status, boolean] {
            const refreshStatus = UIApplication.sharedApplication.backgroundRefreshStatus;
            switch (refreshStatus) {
                case UIBackgroundRefreshStatus.Available:
                    status = Status.Authorized;
                    break;
                case UIBackgroundRefreshStatus.Denied:
                    status = Status.Denied;
                    break;
                case UIBackgroundRefreshStatus.Restricted:
                    status = Status.Restricted;
                    break;
                default:
                    status = Status.Undetermined;
            }
            return [status, true];
        }

        export function request(): Promise<Status> {
            return new Promise(resolve => {
                const contactStore = CNContactStore.new();
                contactStore.requestAccessForEntityTypeCompletionHandler(CNEntityType.Contacts, () => resolve(getStatus()[0]));
            });
        }
    }
    namespace NSPEvent {
        let status: Status = Status.Undetermined;
        function typeFromString(value: string) {
            if (value === 'reminder') {
                return EKEntityType.Reminder;
            } else {
                return EKEntityType.Event;
            }
        }
        export function getStatus(type?: string): [Status, boolean] {
            const eventStatus = EKEventStore.authorizationStatusForEntityType(typeFromString(type));
            switch (eventStatus) {
                case EKAuthorizationStatus.Authorized:
                    status = Status.Authorized;
                    break;
                case EKAuthorizationStatus.Denied:
                    status = Status.Denied;
                    break;
                case EKAuthorizationStatus.Restricted:
                    status = Status.Restricted;
                    break;
                default:
                    status = Status.Undetermined;
            }
            return [status, true];
        }

        export function request(type?: string): Promise<[Status, boolean]> {
            return new Promise(resolve => {
                const aStore = EKEventStore.new();
                aStore.requestAccessToEntityTypeCompletion(typeFromString(type), () => resolve(getStatus(type)));
            });
        }
    }

    export enum NSType {
        Location = 'location',
        Camera = 'camera',
        Microphone = 'microphone',
        Photo = 'photo',
        Contacts = 'contacts',
        Event = 'event',
        Reminder = 'reminder',
        Bluetooth = 'bluetooth',
        Notification = 'notification',
        BackgroundRefresh = 'backgroundRefresh',
        NSPTypeSpeechRecognition = 'speechRecognition',
        MediaLibrary = 'mediaLibrary',
        Motion = 'motion'
    }

    export function openSettings() {
        return new Promise((resolve, reject) => {
            const center = NSNotificationCenter.defaultCenter;
            const observer = function(notif) {
                resolve(true);
                center.removeObserver(observer);
            };
            center.addObserverForNameObjectQueueUsingBlock(UIApplicationDidBecomeActiveNotification, null, null, observer);
            UIApplication.sharedApplication.openURL(NSURL.URLWithString(UIApplicationOpenSettingsURLString));
        });
    }
    export function canOpenSettings() {
        return Promise.resolve(UIApplicationOpenSettingsURLString !== null);
    }
    export async function getPermissionStatus(type, json): Promise<[Status, boolean]> {
        let status: [Status, boolean];
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'getPermissionStatus', type, json);
        }

        switch (type) {
            case NSType.Location: {
                // NSString *locationPermissionType = [RCTConvert NSString:json];
                status = NSPLocation.getStatusForType(json);
                break;
            }
            case NSType.Camera:
                status = NSPAudioVideo.getStatus('video');
                break;
            case NSType.Microphone:
                status = NSPAudioVideo.getStatus('audio');
                break;
            case NSType.Photo:
                status = NSPPhoto.getStatus();
                break;
            case NSType.Contacts:
                status = NSPContacts.getStatus();
                break;
            case NSType.Event:
                status = NSPEvent.getStatus('event');
                break;
            case NSType.Reminder:
                status = NSPEvent.getStatus('reminder');
                break;
            case NSType.Bluetooth:
                status = NSPBluetooth.getStatus();
                break;
            case NSType.Notification:
                status = await NSPNotification.getStatus();
                break;
            case NSType.BackgroundRefresh:
                status = NSPBackgroundRefresh.getStatus();
                break;
            case NSType.NSPTypeSpeechRecognition:
                status = NSPSpeechRecognition.getStatus();
                break;
            case NSType.MediaLibrary:
                status = NSPMediaLibrary.getStatus();
                break;
            case NSType.Motion:
                status = NSPMotion.getStatus();
                break;
            default:
                break;
        }

        return (status);
    }
    export function requestPermission(type, json): Promise<[Status, boolean]> {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'requestPermission', type, json);
        }
        switch (type) {
            case NSType.Location:
                return NSPLocation.request(json);
            case NSType.Camera:
                return NSPAudioVideo.request('video');
            case NSType.Microphone:
                return NSPAudioVideo.request('audio');
            case NSType.Photo:
                return NSPPhoto.request();
            case NSType.Contacts:
                return NSPContacts.request();
            case NSType.Event:
                return NSPEvent.request('event');
            case NSType.Reminder:
                return NSPEvent.request('reminder');
            case NSType.Bluetooth:
                return NSPBluetooth.request();
            case NSType.Notification:
                let types: UIUserNotificationType;
                const typeStrings: string[] = json;
                const osVersion = parseFloat(Device.osVersion);
                if (osVersion >= 10) {
                    if (typeStrings.indexOf('alert') !== -1) {
                        types = types | UNAuthorizationOptions.Alert;
                    }
                    if (typeStrings.indexOf('badge') !== -1) {
                        types = types | UNAuthorizationOptions.Badge;
                    }
                    if (typeStrings.indexOf('sound') !== -1) {
                        types = types | UNAuthorizationOptions.Sound;
                    }
                    if (typeStrings.indexOf('providesAppNotificationSettings') !== -1 && parseFloat(Device.osVersion) >= 12) {
                        types = types | UNAuthorizationOptions.ProvidesAppNotificationSettings;
                    }
                } else {
                    if (typeStrings.indexOf('alert') !== -1) {
                        types = types | UIUserNotificationType.Alert;
                    }
                    if (typeStrings.indexOf('badge') !== -1) {
                        types = types | UIUserNotificationType.Badge;
                    }
                    if (typeStrings.indexOf('sound') !== -1) {
                        types = types | UIUserNotificationType.Sound;
                    }
                }

                return NSPNotification.request(types);
            case NSType.NSPTypeSpeechRecognition:
                return NSPSpeechRecognition.request();
            case NSType.MediaLibrary:
                return NSPMediaLibrary.request();
            case NSType.Motion:
                return NSPMotion.request();
            default:
                return Promise.reject('unknown');
        }
    }
}

const DEFAULTS = {
    location: 'whenInUse',
    notification: ['alert', 'badge', 'sound']
};

type IOSPermissionTypes = `${PermissionsIOS.NSType}`;
const permissionTypes = Object.values(PermissionsIOS.NSType) as IOSPermissionTypes[];

export function canOpenSettings() {
    return PermissionsIOS.canOpenSettings();
}

export function openSettings() {
    return PermissionsIOS.openSettings();
}

export function getTypes() {
    return permissionTypes;
}

type SingleResult = [PermissionsIOS.Status, boolean];
interface MultipleResult { [k: string]: PermissionsIOS.Status }
type Result<T> = T extends any[] ? MultipleResult : SingleResult;

export async function check(permission: IOSPermissionTypes, options?: CheckOptions): Promise<SingleResult> {
    if (Trace.isEnabled()) {
        CLog(CLogTypes.info, 'check', permission, options);
    }
    if (permissionTypes.indexOf(permission) === -1) {

        if (Trace.isEnabled()) {
            CLog(CLogTypes.warning, permission, 'is not a valid permission type on iOS');
        }

        return [PermissionsIOS.Status.Authorized, true];
    }

    let type;

    if (typeof options === 'string') {
        type = options;
    } else if (options && options.type) {
        type = options.type;
    }

    return PermissionsIOS.getPermissionStatus(permission, type || DEFAULTS[permission]);
}

export async function request<T extends IOSPermissionTypes | IOSPermissionTypes[]>(permission: T, options?: RequestOptions): Promise<Result<T>> {
    if (Trace.isEnabled()) {
        CLog(CLogTypes.info, 'request', permission, options);
    }
    if (Array.isArray(permission)) {
        const grantedPermissions: Result<IOSPermissionTypes[]> = {};
        for (let index = 0; index < permission.length; index++) {
            const res = await request(permission[index] , options);
            grantedPermissions[permission[index]] = res[0];
        }
        //@ts-ignore
        return grantedPermissions ;
    }
    if (permissionTypes.indexOf(permission) === -1) {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.warning, permission, 'is not a valid permission type on iOS');
        }

        //@ts-ignore
        return [PermissionsIOS.Status.Authorized, true] as Result<IOSPermissionTypes>;
    }

    //@ts-ignore
    if (permission === 'backgroundRefresh') {
        throw new Error('@nativescript-community/perms: You cannot request backgroundRefresh');
    }

    let type;

    if (typeof options === 'string') {
        type = options;
    } else if (options && options.type) {
        type = options.type;
    }

    //@ts-ignore
    return PermissionsIOS.requestPermission(permission, type || DEFAULTS[permission]);
}

export function checkMultiple(permissions: PermissionsType[]) {
    return Promise.all(permissions.map(permission => this.check(permission))).then(result =>
        result.reduce((acc, value, index) => {
            const name = permissions[index];
            acc[name] = value;
            return acc;
        }, {})
    );
}
