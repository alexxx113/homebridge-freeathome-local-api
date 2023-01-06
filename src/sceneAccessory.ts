import { CharacteristicValue, PlatformAccessory, Service } from "homebridge";
import { FreeAtHomeAccessory } from "./freeAtHomeAccessory";
import { FreeAtHomeContext } from "./freeAtHomeContext";
import { FreeAtHomeHomebridgePlatform } from "./platform";
import { EmptyGuid } from "./util";

/** A scene accessory. */
export class SceneAccessory extends FreeAtHomeAccessory {
  private readonly service: Service;
  private stateOn: boolean;

  /**
   * Constructs a new scene actuator accessory instance.
   * @param platform The free&#64;home Homebridge platform controlling the accessory
   * @param accessory The platform accessory.
   */
  constructor(
    readonly platform: FreeAtHomeHomebridgePlatform,
    readonly accessory: PlatformAccessory<FreeAtHomeContext>
  ) {
    super(platform, accessory);

    // set initial state
    this.stateOn = !!parseInt(
      this.accessory.context.channel.outputs?.odp0000.value ?? "0"
    );

    /* Configure the Switch service for the switch actuator. */
    this.service =
      this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch);

    // register handlers for the On/Off Characteristic
    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(() => this.stateOn);
  }

  private async setOn(value: CharacteristicValue): Promise<void> {
    // avoid unncessary updates or update cache
    if (value === this.stateOn) return;
    else this.stateOn = value as boolean;

    if (!this.stateOn) {
      this.platform.log.error(
        `${this.accessory.displayName} (Scene Actuator ${this.serialNumber}) cannot be disabled`
      );
      return;
    }

    // log event
    this.platform.log.info(
      `${this.accessory.displayName} (Scene Actuator ${
        this.serialNumber
      }) set characteristic On -> ${value.toString()}`
    );

    // set data point at SysAP
    await this.platform.sysap.setDatapoint(
      EmptyGuid,
      this.accessory.context.deviceSerial,
      this.accessory.context.channelId,
      "odp0000",
      "1"
    );

    // Reset automatically after 3s
    setTimeout(() => {
      this.updateDatapoint("odp0000", "0");
    }, 3000);
  }

  public override updateDatapoint(datapoint: string, value: string): void {
    // ignore unknown data points
    if (datapoint !== "odp0000") return;

    // do the update
    this.stateOn = !!parseInt(value);
    this.doUpdateDatapoint(
      "Scene Actuator",
      this.service,
      this.platform.Characteristic.On,
      this.stateOn
    );
  }
}
