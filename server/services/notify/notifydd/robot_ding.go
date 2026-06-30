package notifydd

import (
	"bufio"
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unsafe"

	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

type Dingtalker interface {
	SendText(content string, atmobiles []string, atuserid []string, isatall bool)
	SendMarkdown(title string, text string, atmobiles []string, atuserids []string, isatall bool)
	SendLink(title string, text string, messageurl string, picurl string)
	SendFeedcard(title string, text string, titlechild []string, actionurl []string, btnorientation string)
	SendActioncard(title string, text string, titlechild []string, actionurl []string, btnorientation string)
	SendWholeActioncard(title string, text string, singtitle string, singleurl string, btnorientation string)
}

type Robot struct {
	AccessToken string
	Secret      string
}

func (receiver Robot) Signature() string {
	webhookurl := "https://oapi.dingtalk.com/robot/send?access_token=" + string(receiver.AccessToken)
	// 获取当前秒级时间戳
	timestamp := time.Now()
	milliTimestamp := timestamp.UnixNano() / 1e6
	stringToSign := fmt.Sprintf("%s\n%s", strconv.Itoa(int(milliTimestamp)), receiver.Secret)
	mac := hmac.New(sha256.New, []byte(receiver.Secret))
	mac.Write([]byte(stringToSign))
	sign := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	hookurl := fmt.Sprintf("%s&timestamp=%s&sign=%s", webhookurl, strconv.Itoa(int(milliTimestamp)), sign)
	return hookurl
}

func (receiver Robot) SendText(content string, atmobiles []string, atuserid []string, isatall bool) []byte {
	/*
		发送文本信息
		content: 文本内容
		atmobiles: 需要@的手机号列表
		atuserid: 需要@的用户id列表
		isatall: 是否需要@全体成员
	*/

	type params struct {
		At struct {
			AtMobiles []string `json:"atMobiles"`
			AtUserIds []string `json:"atUserIds"`
			IsAtAll   bool     `json:"isAtAll"`
		} `json:"at"`
		Text struct {
			Content string `json:"content"`
		} `json:"text"`
		Msgtype string `json:"msgtype"`
	}
	var p params
	p.At.AtUserIds = atuserid
	p.At.AtMobiles = atmobiles
	p.At.IsAtAll = isatall
	p.Text.Content = content
	p.Msgtype = "text"
	resA := &p
	result, _ := json.Marshal(resA)
	return result
}

func SendRequest(webhook string, params []byte) {
	reader := bytes.NewReader(params)
	request, err := http.NewRequest("POST", webhook, reader)
	if err != nil {
		mlog.Error(err.Error())
		return
	}
	// 设置请求头及代理
	request.Header.Set("Content-Type", "application/json;charset=UTF-8")
	client := http.Client{}
	// 发送请求
	resp, err := client.Do(request)
	if err != nil {
		mlog.Error(err.Error())

		return
	}
	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		mlog.Error(err.Error())
		return
	}
	//byte数组直接转成string，优化内存
	str := (*string)(unsafe.Pointer(&respBytes))
	mlog.Info(*str)
}

// SplitStringByMaxLineSize 按最大字节数切割字符串，保证每块都是完整的行
func SplitStringByMaxLineSize(str string, maxBytes int) []string {
	var chunks []string
	var buffer bytes.Buffer
	scanner := bufio.NewScanner(strings.NewReader(str))

	for scanner.Scan() {
		line := scanner.Text() + "\n" // 补回被Scanner去除的换行符
		lineBytes := []byte(line)

		// 如果当前行单独超过限制
		if len(lineBytes) > maxBytes {
			if buffer.Len() > 0 {
				chunks = append(chunks, buffer.String())
				buffer.Reset()
			}
			chunks = append(chunks, string(lineBytes))
			continue
		}

		// 检查添加后是否超限
		if buffer.Len()+len(lineBytes) > maxBytes {
			chunks = append(chunks, buffer.String())
			buffer.Reset()
		}

		buffer.Write(lineBytes)
	}

	// 添加最后剩余内容
	if buffer.Len() > 0 {
		chunks = append(chunks, buffer.String())
	}

	return chunks
}
