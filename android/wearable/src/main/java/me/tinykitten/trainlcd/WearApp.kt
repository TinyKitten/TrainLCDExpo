package me.tinykitten.trainlcd

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Devices
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.Icon
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import me.tinykitten.trainlcd.theme.TrainLCDTheme

@Composable
fun localizeCurrentState(stateKey: String, isNextLastStop: Boolean): String {
    return when (stateKey) {
        "CURRENT" -> stringResource(R.string.current_station_state)
        "NEXT" -> if (isNextLastStop)
            stringResource(R.string.next_last_station_state)
        else
            stringResource(R.string.next_station_state)
        "ARRIVING" -> if (isNextLastStop)
            stringResource(R.string.arriving_last_station_state)
        else
            stringResource(R.string.arriving_station_state)
        else -> ""
    }
}

@Composable
fun WearApp(
    payload: WearablePayload?
) {
    val isJP = LocalContext
        .current
        .resources
        .configuration
        .locales[0]
        .language
        .equals("ja")
    val localizedStationName =
        (
                if (isJP) payload?.stationName
                else payload?.stationNameRoman
                ).orEmpty()

    if (payload != null) {
        TrainLCDTheme {
            Column(
                modifier = Modifier
                    .background(MaterialTheme.colors.background)
                    .fillMaxSize(),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                if (payload.badLocationAccuracy) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            modifier = Modifier.size(16.dp),
                            painter = painterResource(R.drawable.outline_wrong_location_24),
                            contentDescription = stringResource(R.string.low_accuracy),
                            tint = Color.Yellow
                        )
                        Text(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 32.dp),
                            textAlign = TextAlign.Center,
                            text = stringResource(R.string.low_accuracy),
                            fontSize = 8.sp,
                            color = Color.Yellow
                        )
                    }
                }
                Box(
                    modifier = Modifier
                        .offset(y = if (payload.badLocationAccuracy) (-16).dp else 0.dp)
                        .fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(
                        modifier = Modifier
                            .align(Alignment.Center)
                    ) {
                        Text(
                            modifier = Modifier.fillMaxWidth(),
                            textAlign = TextAlign.Center,
                            text = localizeCurrentState(
                                payload.stateKey,
                                payload.isNextLastStop
                            ),
                            fontSize = 16.sp
                        )
                        Text(
                            modifier = Modifier.fillMaxWidth(),
                            textAlign = TextAlign.Center,
                            text = localizedStationName,
                            fontSize = 24.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        if (payload.stationNumber.isNotEmpty()) {
                            Text(
                                modifier = Modifier.fillMaxWidth(),
                                textAlign = TextAlign.Center,
                                text = "${payload.stationNumber}",
                                fontSize = 16.sp
                            )
                        }
                    }
                }
            }
        }
    } else {
        TrainLCDTheme {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colors.background),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center,
                    text = stringResource(R.string.not_connected)
                )
            }
        }
    }
}

@Preview(device = Devices.WEAR_OS_SMALL_ROUND, showSystemUi = true)
@Composable
fun NotLaunchedSPApp() {
    WearApp(
        payload = null
    )
}

@Preview(device = Devices.WEAR_OS_SMALL_ROUND, showSystemUi = true)
@Composable
fun DefaultPreview() {
    WearApp(
        payload = WearablePayload(
            stateKey = "CURRENT",
            stationName = "瑞江",
            stationNumber = "S-19",
            stationNameRoman = "Mizue",
            badLocationAccuracy = false,
            isNextLastStop = false
        )
    )
}

@Preview(device = Devices.WEAR_OS_SMALL_ROUND, showSystemUi = true)
@Composable
fun LowAccuracyPreview() {
    WearApp(
        payload = WearablePayload(
            stateKey = "CURRENT",
            stationName = "瑞江",
            stationNumber = "S-19",
            stationNameRoman = "Mizue",
            badLocationAccuracy = true,
            isNextLastStop = false
        )
    )
}

@Preview(device = Devices.WEAR_OS_SMALL_ROUND, showSystemUi = true)
@Composable
fun NextIsTerminusPreview() {
    WearApp(
        payload = WearablePayload(
            stateKey = "NEXT",
            stationName = "瑞江",
            stationNumber = "S-19",
            stationNameRoman = "Mizue",
            badLocationAccuracy = false,
            isNextLastStop = true
        )
    )
}
@Preview(device = Devices.WEAR_OS_SMALL_ROUND, showSystemUi = true)
@Composable
fun ApproachingToTerminusPreview() {
    WearApp(
        payload = WearablePayload(
            stateKey = "ARRIVING",
            stationName = "瑞江",
            stationNumber = "S-19",
            stationNameRoman = "Mizue",
            badLocationAccuracy = false,
            isNextLastStop = true
        )
    )
}

@Preview(device = Devices.WEAR_OS_SMALL_ROUND, showSystemUi = true)
@Composable
fun LongNameStationPreview() {
    WearApp(
        payload = WearablePayload(
            stateKey = "CURRENT",
            stationName = "長者ヶ浜潮騒はまなす公園前",
            stationNumber = "",
            stationNameRoman = "Chōjagahama Shiosai Hamanasu Kōenmae",
            badLocationAccuracy = false,
            isNextLastStop = false
        )
    )
}
