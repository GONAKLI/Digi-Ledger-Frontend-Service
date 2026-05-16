import { View, Text, StyleSheet } from "react-native";
import Modal from 'react-native-modal'

export default function OtpModel(props) {
    let modelShow = props.modelShow;
    let setModelShow = props.setModelShow
    let message = props.message;

    setTimeout(() => {
        if(modelShow) setModelShow(false);
    }, 5000);

    return (
        <Modal
            isVisible={modelShow}
            animationIn={'slideInUp'}
            animationOut={'slideOutDown'}
            propagateSwipe={true}
            backdropOpacity={0.4}
            onBackdropPress={() => setModelShow(false)}
            useNativeDriver
        >
            <View style={Styles.parentContainer}>
                <View style={Styles.iconContainer}>
                    <Text style={Styles.icon}>⚠️</Text>
                </View>
                <Text style={Styles.textMessage}>{message}</Text>
            </View>
        </Modal>
    )
}

let Styles = StyleSheet.create({
    parentContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#ffe5e5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    icon: {
        fontSize: 28,
    },
    textMessage: {
        fontSize: 16,
        color: '#2c3e50',
        textTransform: 'capitalize',
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 22,
    }
})